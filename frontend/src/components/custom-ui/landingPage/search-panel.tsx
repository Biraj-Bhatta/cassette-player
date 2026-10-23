// landingPage/search-panel.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SearchLibrary } from "@wails/go/main/App";
import type { db } from "@wails/go/models";
import type { Album, Track } from "@/types/model";
import { SearchFilter, type SearchField } from "@/components/custom-ui/landingPage/search-filter";
import Cover from "@/components/custom-ui/albumbs/cover";

type Artist = { id: string; name: string };

type Props = {
    query: string;
    onQueryChange: (q: string) => void;
    field: SearchField;
    onFieldChange: (f: SearchField) => void;
    onPlayList: (list: Track[], index: number) => void;
    onOpenArtist: (artist: Artist) => void;
    onOpenAlbum: (album: Album) => void;
};

// Waits 200 ms after the last keystroke, then asks the backend.
// Stale responses are ignored, so the dropdown never shows old results.
function useLibrarySearch(query: string, field: SearchField) {
    const [state, setState] = useState<{
        data: db.SearchResults | null;
        loading: boolean;
        error: string | null;
    }>({ data: null, loading: false, error: null });
    const reqId = useRef(0);

    useEffect(() => {
        const q = query.trim();
        if (!q) {
            setState({ data: null, loading: false, error: null });
            return;
        }

        const id = ++reqId.current;
        setState((s) => ({ ...s, loading: true, error: null }));

        const timer = setTimeout(() => {
            SearchLibrary(q, field, 8)
                .then((data) => {
                    if (id === reqId.current) setState({ data, loading: false, error: null });
                })
                .catch((err) => {
                    if (id === reqId.current) {
                        setState({ data: null, loading: false, error: String(err) });
                    }
                });
        }, 200);

        return () => clearTimeout(timer);
    }, [query, field]);

    return state;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mb-2">
            <div className="px-3 pb-1 pt-2 text-xs font-bold uppercase text-zinc-500">{title}</div>
            {children}
        </div>
    );
}

const rowClass =
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-muted";

export function SearchPanel({
    query,
    onQueryChange,
    field,
    onFieldChange,
    onPlayList,
    onOpenArtist,
    onOpenAlbum,
}: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const { data, loading, error } = useLibrarySearch(query, field);

    const hasQuery = query.trim().length > 0;
    const visible = open && hasQuery;

    // Close on outside click or Escape while the dropdown is open.
    useEffect(() => {
        if (!open) return;

        const onDown = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // After the user picks something, close the dropdown and clear the search.
    const finish = () => {
        setOpen(false);
        onQueryChange("");
    };

    const songs = data?.songs ?? [];
    const artists = data?.artists ?? [];
    const albums = data?.albums ?? [];
    const nothing = !loading && !error && songs.length + artists.length + albums.length === 0;

    return (
        <div
            ref={wrapRef}
            className="relative"
            onFocusCapture={() => setOpen(true)}
        >
            <SearchFilter
                query={query}
                onQueryChange={onQueryChange}
                field={field}
                onFieldChange={onFieldChange}
            />

            {visible && (
                <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 bg-white p-2 text-black shadow-xl"
                >
                    {loading && songs.length + artists.length + albums.length === 0 && (
                        <p className="px-3 py-2 text-sm text-zinc-500">Searching…</p>
                    )}

                    {error && <p className="px-3 py-2 text-sm text-red-600">Search failed: {error}</p>}

                    {nothing && (
                        <p className="px-3 py-2 text-sm text-zinc-500">
                            No results for “{query.trim()}”.
                        </p>
                    )}

                    {songs.length > 0 && (
                        <Section title="Songs">
                            {songs.map((song, i) => (
                                <button
                                    key={song.id}
                                    type="button"
                                    className={rowClass}
                                    onClick={() => {
                                        onPlayList(songs as Track[], i);
                                        finish();
                                    }}
                                >
                                    {song.thumbnail ? (
                                        <img
                                            src={song.thumbnail}
                                            alt=""
                                            className="size-10 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded bg-neutral-200 text-neutral-500">
                                                ♪
                                            </div>
                                        )}
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{song.title}</div>
                                        <div className="truncate text-sm text-zinc-500">
                                            Song • {song.artist || "Unknown artist"}
                                            {song.album ? ` • ${song.album}` : ""}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </Section>
                    )}

                    {artists.length > 0 && (
                        <Section title="Artists">
                            {artists.map((artist) => (
                                <button
                                    key={artist.id}
                                    type="button"
                                    className={rowClass}
                                    onClick={() => {
                                        onOpenArtist({ id: artist.id, name: artist.name });
                                        finish();
                                    }}
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-700 font-bold text-neutral-200">
                                        {artist.name.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{artist.name}</div>
                                        <div className="text-sm text-zinc-500">Artist</div>
                                    </div>
                                </button>
                            ))}
                        </Section>
                    )}

                    {albums.length > 0 && (
                        <Section title="Albums">
                            {albums.map((album) => (
                                <button
                                    key={album.id}
                                    type="button"
                                    className={rowClass}
                                    onClick={() => {
                                        onOpenAlbum(album as Album);
                                        finish();
                                    }}
                                >
                                    <div className="size-10 shrink-0 overflow-hidden rounded">
                                        <Cover thumbnail={album.thumbnail} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{album.title}</div>
                                        <div className="truncate text-sm text-zinc-500">
                                            Album • {album.albumArtist || "Unknown artist"}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}
