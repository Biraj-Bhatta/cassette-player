// artists/artists-list.tsx
import { useMemo, useState } from "react";
import { GetArtists } from "@wails/go/main/App";
import { ArtistAvatar } from "@/components/custom-ui/common/artist-avtar";
import ArtistsState from "@/components/custom-ui/artists/artists-state";
import { invalidateCache, useCachedList } from "@/lib/library-cache";
import { useBlockingScan } from "@/lib/scan-state";

type Artist = {
    id: string;
    name: string;
};

type Props = {
    onSelect?: (artist: Artist) => void;
};

// Case-insensitive search. Names that start with the query come first,
// then names that contain it. Each group is sorted alphabetically.
function filterArtists(artists: Artist[], query: string): Artist[] {
    const q = query.trim().toLowerCase();
    if (!q) return artists;

    return artists
        .filter((a) => a.name.toLowerCase().includes(q))
        .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
            const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
            return aStarts - bStarts || a.name.localeCompare(b.name);
        });
}

export default function ArtistsList({ onSelect }: Props) {
    const [query, setQuery] = useState("");
    const scanning = useBlockingScan();

    // Cached under "artists", so switching views doesn't refetch.
    const { items: artists, loading, error } = useCachedList<Artist>(
        "artists",
        0,
        () => GetArtists() as Promise<Artist[]>,
    );

    const visible = useMemo(() => filterArtists(artists, query), [artists, query]);

    // Picks one state at a time. The grid is shown only when there is something to show.
    const renderBody = () => {
        if (scanning) {
            return <ArtistsState type="scanning" />;
        }
        if (error) {
            return (
                <ArtistsState
                    type="error"
                    message={`Failed to load artists: ${error}`}
                    onRetry={() => invalidateCache("artists")}
                />
            );
        }
        if (artists.length === 0) {
            if (loading) return <ArtistsState type="loading" />;
            return <ArtistsState type="empty" />;
        }
        if (visible.length === 0) {
            return <ArtistsState type="no-matches" query={query} />;
        }

        return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 p-2">
                {visible.map((artist) => (
                    <div
                        key={artist.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect?.(artist)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onSelect?.(artist);
                        }}
                        className="group cursor-pointer rounded-sm p-6 text-left hover:bg-muted"
                    >
                        <ArtistAvatar
                            id={artist.id}
                            name={artist.name}
                            onPlay={() => console.log("play", artist.name)}
                        />
                        <div className="mt-3 truncate text-lg font-bold" title={artist.name}>
                            {artist.name}
                        </div>
                        <div className="mt-1 text-(--app-text-muted)">Artist</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-col items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Artists</h2>
                </div>
                <div className="flex w-full justify-between">
                    <div>
                        {artists.length > 0 && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") setQuery("");
                                    }}
                                    placeholder="Search artists…"
                                    aria-label="Search artists"
                                    className="w-64 rounded-full border bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-(--app-text-muted) focus:border-foreground"
                                />

                            </div>
                        )}
                    </div>
                    <div>
                        {artists.length > 0 && (
                            <p className="mt-1 text-sm text-(--app-text-muted)">
                                {visible.length} of {artists.length}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {renderBody()}
        </div>
    );
}
