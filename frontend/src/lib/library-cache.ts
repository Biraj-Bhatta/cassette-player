// lib/library-cache.ts
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { EventsOn } from "@wails/runtime";

export type CachedList<T> = { items: T[]; hasMore: boolean };

// Fresh data, keyed by list name.
const cache = new Map<string, CachedList<unknown>>();
// Last known data. Shown while a refresh is in flight, so views don't go blank.
const stale = new Map<string, CachedList<unknown>>();
const EMPTY: CachedList<never> = { items: [], hasMore: false };

let version = 0;
const subscribers = new Set<() => void>();

function notifyAll() {
    version++;
    subscribers.forEach((notify) => notify());
}

function markAllStale() {
    cache.forEach((value, key) => stale.set(key, value));
    cache.clear();
}

function subscribe(notify: () => void) {
    subscribers.add(notify);
    return () => {
        subscribers.delete(notify);
    };
}

const getVersion = () => version;

// After a scan, mark every list as stale. The visible screen keeps its
// current data and reloads in the background.
EventsOn("scan:done", () => {
    markAllStale();
    notifyAll();
});

// Marks every list as stale, for example after a delete.
export function clearCache() {
    markAllStale();
    notifyAll();
}

// Marks one list as stale, for example after a favourite changes.
export function invalidateCache(key: string) {
    const value = cache.get(key);
    if (value) {
        stale.set(key, value);
        cache.delete(key);
    }
    notifyAll();
}

// Returns cached items for key, or fetches them once and stores them.
export async function getOrFetch<T>(key: string, fetcher: () => Promise<T[]>): Promise<T[]> {
    const hit = cache.get(key) as CachedList<T> | undefined;
    if (hit) return hit.items;

    const items = (await fetcher()) ?? [];
    cache.set(key, { items, hasMore: false });
    return items;
}

// Loads a list into the cache and returns it. Pass pageSize 0 for a list that is not paged.
// Pass key null to do nothing.
export function useCachedList<T>(
    key: string | null,
    pageSize: number,
    fetchPage: (offset: number, limit: number) => Promise<T[]>,
) {
    const rev = useSyncExternalStore(subscribe, getVersion);
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRef = useRef(fetchPage);
    fetchRef.current = fetchPage;
    const keyRef = useRef(key);
    keyRef.current = key;
    const busy = useRef(false);

    // Load the first page only when nothing fresh is cached for this key.
    useEffect(() => {
        if (!key) return;
        if (cache.has(key)) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchRef.current(0, pageSize)
            .then((page) => {
                const items = page ?? [];
                cache.set(key, { items, hasMore: pageSize > 0 && items.length === pageSize });
                stale.delete(key);
                if (!cancelled) rerender();
            })
            .catch((err) => {
                if (!cancelled) setError(String(err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [key, pageSize, rev]);

    // Appends the next page to the fresh cached list.
    const loadMore = useCallback(() => {
        if (!key || pageSize <= 0 || busy.current) return;
        const current = cache.get(key) as CachedList<T> | undefined;
        if (!current?.hasMore) return;

        busy.current = true;
        setLoading(true);

        fetchRef.current(current.items.length, pageSize)
            .then((page) => {
                const more = page ?? [];
                cache.set(key, {
                    items: [...current.items, ...more],
                    hasMore: more.length === pageSize,
                });
                if (keyRef.current === key) rerender();
            })
            .catch((err) => {
                if (keyRef.current === key) setError(String(err));
            })
            .finally(() => {
                busy.current = false;
                if (keyRef.current === key) setLoading(false);
            });
    }, [key, pageSize]);

    // Fresh data if present, otherwise the last known data while it reloads.
    const entry = ((key &&
        ((cache.get(key) ?? stale.get(key)) as CachedList<T> | undefined)) ||
        EMPTY) as CachedList<T>;

    return {
        items: entry.items,
        hasMore: entry.hasMore,
        loading,
        error,
        loadMore,
    };
}
