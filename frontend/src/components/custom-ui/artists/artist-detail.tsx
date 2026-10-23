// artists/artist-detail.tsx
import { GetSongsByArtist } from "@wails/go/main/App";
import type { Track, TrackActions } from "@/types/model";
import ListUi from "@/components/custom-ui/common/list-ui";
import { ArtistAvatar } from "@/components/custom-ui/common/artist-avtar";
import { useCachedList } from "@/lib/library-cache";

type Props = {
    artist: { id: string; name: string };
    onBack: () => void;
    onPlayQueue: (list: Track[], index: number) => void;
    currentId?: string | null;
    actions: TrackActions;
};

export default function ArtistDetail({ artist, onBack, onPlayQueue, currentId, actions }: Props) {
    // Cached per artist, so going back to this artist is instant.
    const { items: tracks, loading, error } = useCachedList<Track>(
        `artist-songs:${artist.id}`,
        0,
        () => GetSongsByArtist(artist.id),
    );

    return (
        <div className="min-h-full">
            <div className="bg-gradient-to-b from-neutral-700 to-neutral-900 px-6 pb-6 pt-4">
                <button onClick={onBack}
                    className="flex m-6 top-6 left-6 z-10 rounded-full bg-background px-4 py-2 font-extrabold shadow hover:bg-muted"

                >
                    ← Back
                </button>

                <div className="flex items-end gap-6">
                    <div className="w-48 shrink-0">
                        <ArtistAvatar id={artist.id} name={artist.name} />
                    </div>

                    <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase text-neutral-300">Artist</div>
                        <h1 className="truncate text-4xl font-bold text-white">{artist.name}</h1>
                        <div className="mt-2 text-sm text-neutral-300">{tracks.length} songs</div>
                    </div>
                </div>

            </div>
            <div className="flex flex-col py-8 px-12">

                <button
                    onClick={() => {
                        if (tracks.length) onPlayQueue(tracks, 0);
                    }}
                    disabled={!tracks.length}
                    aria-label="Play all songs"
                    className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-black transition hover:scale-105 disabled:opacity-40"
                >
                    ▶
                </button>
                <h2 className="mb-2 text-2xl font-bold">Songs</h2>
            </div>

            <div className="px-2 pb-6">
                {error && <p className="p-4 text-(--app-danger)">Failed to load songs: {error}</p>}
                {loading && tracks.length === 0 && (
                    <p className="p-4 text-(--app-text-muted)">Loading songs…</p>
                )}
                <ListUi<Track>
                    items={tracks}
                    onPlay={onPlayQueue}
                    currentId={currentId}
                    actions={actions}
                />
            </div>
        </div>
    );
}
