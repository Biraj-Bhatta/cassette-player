// playlists/playlist-card.tsx
import type { Playlist } from "@/hooks/usePlaylists";

type Props = {
    playlist: Playlist;
    onOpen: () => void;
};

export default function PlaylistCard({ playlist, onOpen }: Props) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex flex-col rounded-md p-4 text-left transition hover:bg-muted"
        >
            <div className="flex aspect-square w-full items-center justify-center rounded-md bg-linear-to-br from-neutral-600 to-neutral-800 shadow-lg">
                <svg viewBox="0 0 24 24" className="h-[40%] w-[40%] fill-white/80">
                    <path d="M15 6H3v2h12V6Zm0 4H3v2h12v-2ZM3 16h8v-2H3v2Zm13.5-1.5V9.5L21 12l-4.5 3.5Z" />
                </svg>
            </div>

            <div className="mt-3 truncate font-semibold">{playlist.name}</div>
            <div className="text-sm text-(--app-text-muted)">
                Playlist • {playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}
            </div>
        </button>
    );
}
