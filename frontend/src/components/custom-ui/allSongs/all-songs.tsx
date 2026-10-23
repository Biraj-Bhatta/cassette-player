// allSongs/all-songs.tsx
import { useEffect, useRef } from "react";
import { GetTracks } from "@wails/go/main/App";
import type { Track, TrackActions } from "@/types/model";
import ListUi from "@/components/custom-ui/common/list-ui";
import { invalidateCache, useCachedList } from "@/lib/library-cache";
import { useBlockingScan } from "@/lib/scan-state";
import LibraryState from "@/components/custom-ui/allSongs/library-state";

const PAGE_SIZE = 100;

type Props = {
    onPlay: (list: Track[], index: number) => void;
    currentId?: string | null;
    actions?: TrackActions;
};

// Finds the nearest ancestor that scrolls vertically.
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
    let node = el?.parentElement ?? null;
    while (node) {
        const { overflowY } = getComputedStyle(node);
        if (overflowY === "auto" || overflowY === "scroll") return node;
        node = node.parentElement;
    }
    return null;
}

export default function SongList({ onPlay, currentId, actions }: Props) {
    const { items, hasMore, loading, error, loadMore } = useCachedList<Track>(
        "tracks",
        PAGE_SIZE,
        (offset, limit) => GetTracks(offset, limit),
    );
    const scanning = useBlockingScan();

    const rootRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Loads the next page when the sentinel nears the visible area.
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { root: getScrollParent(rootRef.current), rootMargin: "300px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    if (scanning) {
        return <LibraryState type="scanning" />;
    }

    if (error) {
        return (
            <LibraryState
                type="error"
                message={`Failed to load songs: ${error}`}
                onRetry={() => invalidateCache("tracks")}
            />
        );
    }

    if (loading && items.length === 0) {
        return <LibraryState type="loading" />;
    }

    if (!loading && items.length === 0) {
        return <LibraryState type="empty" />;
    }

    return (
        <div ref={rootRef} className="p-2">
            <ListUi<Track>
                items={items}
                onPlay={onPlay}
                currentId={currentId}
                actions={actions}
            />

            {hasMore && <div ref={sentinelRef} className="h-10" />}

            {loading && items.length > 0 && (
                <p className="py-4 text-center text-sm text-(--app-text-muted)">
                    Loading more…
                </p>
            )}
        </div>
    );
}
