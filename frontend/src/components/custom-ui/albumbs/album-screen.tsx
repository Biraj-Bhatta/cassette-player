// albumbs/albums-screen.tsx
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { GetAlbums, GetAlbumsByArtist, GetArtists, ListSongsByAlbum } from "@wails/go/main/App";
import type { Album, Track, TrackActions } from "@/types/model";
import AlbumCard from "@/components/custom-ui/albumbs/album-card";
import AlbumDetail from "@/components/custom-ui/albumbs/album-detail";
import ArtistGrid, { type ArtistOption } from "@/components/custom-ui/albumbs/artist-grid";
import AlbumsState from "@/components/custom-ui/albumbs/albums-state";
import { getOrFetch, invalidateCache, useCachedList } from "@/lib/library-cache";
import { useBlockingScan } from "@/lib/scan-state";

type Mode = "all" | "artists";

const PAGE_SIZE = 60;

type Props = {
    onPlayList: (list: Track[], index: number) => void;
    actions: TrackActions;
    scrollRef: RefObject<HTMLDivElement | null>;
    // Album to open straight away, set by "Go to album" in another view.
    initialAlbum?: Album | null;
};

const TABS: [Mode, string][] = [
    ["all", "All albums"],
    ["artists", "By artist"],
];

export default function AlbumsScreen({ onPlayList, actions, scrollRef, initialAlbum }: Props) {
    const [mode, setMode] = useState<Mode>("all");
    const [artist, setArtist] = useState<ArtistOption | null>(null);
    const [selected, setSelected] = useState<Album | null>(null);

    const scanning = useBlockingScan();

    const artistId = mode === "artists" ? artist?.id : undefined;
    const showArtistGrid = mode === "artists" && !artist;

    // Artist list: cached, loaded only on the "By artist" tab.
    const { items: artists, loading: artistsLoading, error: artistsError } =
        useCachedList<ArtistOption>(
            mode === "artists" ? "artists" : null,
            0,
            () => GetArtists() as Promise<ArtistOption[]>,
        );

    useEffect(() => {
        if (initialAlbum) setSelected(initialAlbum);
    }, [initialAlbum]);

    // Album pages: cached per source (all albums, or one artist).
    const albumsKey = showArtistGrid ? null : artistId ? `albums:artist:${artistId}` : "albums:all";
    const { items: albums, hasMore, loading, error, loadMore } = useCachedList<Album>(
        albumsKey,
        PAGE_SIZE,
        (offset, limit) =>
            artistId ? GetAlbumsByArtist(artistId, offset, limit) : GetAlbums(offset, limit),
    );

    // Songs of the opened album: cached per album.
    const { items: tracks } = useCachedList<Track>(
        selected ? `album-songs:${selected.id}` : null,
        0,
        () => ListSongsByAlbum(selected?.id ?? ""),
    );

    // ===== Scroll restore =====
    const savedScroll = useRef(0);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const openAlbum = (album: Album) => {
        savedScroll.current = scrollRef.current?.scrollTop ?? 0;
        setSelected(album);
    };

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = selected ? 0 : savedScroll.current;
    }, [selected]);

    // ===== Infinite scroll =====
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { root: scrollRef.current, rootMargin: "300px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loadMore, selected, showArtistGrid, scrollRef]);

    // ===== Actions =====
    const playAlbum = async (album: Album) => {
        const list = await getOrFetch<Track>(`album-songs:${album.id}`, () =>
            ListSongsByAlbum(album.id),
        );
        if (list.length) onPlayList(list, 0);
    };

    const switchMode = (next: Mode) => {
        setMode(next);
        setArtist(null);
        setSelected(null);
    };

    // ===== Album detail view =====
    if (selected) {
        return (
            <AlbumDetail
                album={selected}
                tracks={tracks}
                actions={actions}
                onBack={() => setSelected(null)}
                onPlayAll={() => {
                    if (tracks.length) onPlayList(tracks, 0);
                }}
                onPlayList={onPlayList}
            />
        );
    }

    // ===== Body: picks one state at a time =====
    const renderBody = () => {
        if (scanning) {
            return <AlbumsState type="scanning" />;
        }

        if (showArtistGrid) {
            if (artistsError) {
                return (
                    <AlbumsState
                        type="error"
                        message={`Failed to load artists: ${artistsError}`}
                        onRetry={() => invalidateCache("artists")}
                    />
                );
            }
            if (artistsLoading && artists.length === 0) {
                return <AlbumsState type="loading" />;
            }
            if (!artistsLoading && artists.length === 0) {
                return <AlbumsState type="no-artists" />;
            }
            return <ArtistGrid artists={artists} onSelect={setArtist} />;
        }

        if (error) {
            return (
                <AlbumsState
                    type="error"
                    message={`Failed to load albums: ${error}`}
                    onRetry={() => invalidateCache(albumsKey ?? "albums:all")}
                />
            );
        }

        if (albums.length === 0) {
            if (loading) return <AlbumsState type="loading" />;
            if (artist) return <AlbumsState type="no-albums-for-artist" artistName={artist.name} />;
            return <AlbumsState type="empty" />;
        }

        return (
            <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                    {albums.map((album) => (
                        <AlbumCard
                            key={album.id}
                            album={album}
                            onOpen={() => openAlbum(album)}
                            onPlay={() => playAlbum(album)}
                        />
                    ))}
                </div>

                {hasMore && <div ref={sentinelRef} className="h-10" />}

                {loading && (
                    <p className="py-4 text-center text-sm text-(--app-text-muted)">
                        Loading more…
                    </p>
                )}
            </>
        );
    };

    // ===== Album and artist list view =====
    return (
        <div className="p-6">
            <div role="tablist" className="mb-6 inline-flex rounded-full bg-muted p-1 text-sm">
                {TABS.map(([value, label]) => (
                    <button
                        key={value}
                        role="tab"
                        aria-selected={mode === value}
                        onClick={() => switchMode(value)}
                        className={`rounded-full px-4 py-1.5 transition ${
                            mode === value
                                ? "bg-foreground text-background"
                                : "text-(--app-text-muted) hover:text-foreground"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {!showArtistGrid && (
                <div className="mb-6 flex items-center gap-4">
                    {artist && (
                        <button
                            type="button"
                            onClick={() => setArtist(null)}
                            className="rounded-full bg-background px-4 py-2 text-sm font-semibold shadow hover:bg-muted"
                        >
                            ← All artists
                        </button>
                    )}
                    <h2 className="text-lg font-semibold text-foreground">
                        {artist ? `Albums by ${artist.name}` : "All albums"}
                    </h2>
                </div>
            )}

            {renderBody()}
        </div>
    );
}
