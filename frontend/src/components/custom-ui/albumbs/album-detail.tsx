// albums/album-detail.tsx
import type { Album, Track, TrackActions } from "@/types/model";
import ListUi from "@/components/custom-ui/common/list-ui";
import Cover from "@/components/custom-ui/albumbs/cover";

type Props = {
    album: Album;
    tracks: Track[];
    actions: TrackActions;
    onBack: () => void;
    onPlayAll: () => void;
    onPlayList: (list: Track[], index: number) => void;
};

export default function AlbumDetail({
    album,
    tracks,
    actions,
    onBack,
    onPlayAll,
    onPlayList,
}: Props) {
    return (
        <div className="min-h-full">
            <div className="bg-gradient-to-b from-neutral-700 to-neutral-900 px-6 pb-6 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex m-6 top-6 left-6 z-10 rounded-full bg-background px-4 py-2 font-extrabold shadow hover:bg-muted"
                >
                    ← Back
                </button>




                <div className="flex items-end gap-6">
                    <div className="h-48 w-48 shrink-0 overflow-hidden rounded-md bg-neutral-800 shadow-2xl">
                        <Cover thumbnail={album.thumbnail} />
                    </div>

                    <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase text-neutral-300">Album</div>
                        <h1 className="truncate text-4xl font-bold text-white">{album.title}</h1>
                        <div className="mt-2 text-sm text-neutral-300">
                            {album.albumArtist || "Unknown artist"} • {album.songCount} songs
                        </div>
                    </div>
                </div>

            </div>
            <div className="flex px-12 py-6">
                <button
                    onClick={onPlayAll}
                    disabled={!tracks.length}
                    aria-label="Play album"
                    className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-black transition hover:scale-105 disabled:opacity-40"
                >
                    ▶
                </button>
            </div>

            <div className="px-2 pb-6">
                <h2 className="mb-2 text-2xl font-bold">Songs</h2>

                <ListUi<Track>
                    items={tracks}
                    actions={actions}
                    onPlay={onPlayList}
                />
            </div>
        </div>
    );
}
