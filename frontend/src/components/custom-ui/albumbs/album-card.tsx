// albums/album-card.tsx
import type { Album } from "@/types/model";
import Cover from "@/components/custom-ui/albumbs/cover";


type Props = {
    album: Album;
    onOpen: () => void;
    onPlay: () => void;
};

export default function AlbumCard({ album, onOpen, onPlay }: Props) {

    return (
        <div
            onClick={onOpen}
            className="group cursor-pointer rounded-md p-3 transition hover:bg-muted"
        >
            <div className="relative aspect-[9/12] overflow-hidden rounded-md bg-neutral-800 shadow-lg">
                <Cover thumbnail={album.thumbnail} />

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlay();
                    }}
                    aria-label={`Play ${album.title}`}
                    className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full bg-green-500 text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100"
                >
                    ▶
                </button>
            </div>
            <div className="mt-3 truncate font-semibold text-black">{album.title}</div>
            <div className="truncate text-sm text-neutral-600">
                Album • {album.albumArtist || "Unknown artist"}
            </div>
        </div>
    );
}
