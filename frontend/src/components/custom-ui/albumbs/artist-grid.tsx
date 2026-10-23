// albums/artist-grid.tsx
import { useMemo, useState } from "react";
import { ArtistAvatar } from "@/components/custom-ui/common/artist-avtar"

export type ArtistOption = {
    id: string;
    name: string;
};

// Case-insensitive search. Names that start with the query come first,
// then names that contain it. Each group is sorted alphabetically.
export function filterArtists(artists: ArtistOption[], query: string): ArtistOption[] {
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

type Props = {
    artists: ArtistOption[];
    onSelect: (artist: ArtistOption) => void;
    // Optional: play all songs of an artist from the hover button.
    onPlayArtist?: (artist: ArtistOption) => void;
};

export default function ArtistGrid({ artists, onSelect, onPlayArtist }: Props) {
    const [query, setQuery] = useState("");
    const visible = useMemo(() => filterArtists(artists, query), [artists, query]);

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setQuery("");
                    }}
                    placeholder="Search artists…"
                    aria-label="Search artists"
                    className="w-full max-w-xs rounded-full border bg-muted-lite px-4 py-2 text-sm text-black outline-none placeholder:text-black focus:border-black"
                />
                <span className="text-sm text-neutral-400">
                    {visible.length} of {artists.length} artists
                </span>
            </div>

            {visible.length === 0 ? (
                <p className="text-neutral-400">No artists match “{query.trim()}”.</p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] items-center justify-center gap-4">
                    {visible.map((artist) => (
                        <div
                            key={artist.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelect(artist)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") onSelect(artist);
                            }}
                            className="group flex cursor-pointer flex-col items-center rounded-md p-3 text-center transition hover:bg-muted"
                        >
                            <div className="w-40">
                                <ArtistAvatar
                                    id={artist.id}
                                    name={artist.name}
                                    onPlay={onPlayArtist ? () => onPlayArtist(artist) : undefined}
                                />
                            </div>

                            <div className="mt-3 w-full truncate font-semibold text-neutral-500">
                                {artist.name}
                            </div>
                            <div className="text-xs text-neutral-400">Artist</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
