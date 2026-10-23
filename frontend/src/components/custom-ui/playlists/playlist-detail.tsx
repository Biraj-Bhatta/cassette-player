// playlists/playlist-detail.tsx
import { useState } from "react";
import { GetPlaylistTracks } from "@wails/go/main/App";
import type { Track, TrackActions } from "@/types/model";
import ListUi from "@/components/custom-ui/common/list-ui";
import TrackMenu from "@/components/custom-ui/common/track-menu";
import { ConfirmDialog, PromptDialog } from "@/components/custom-ui/common/dialogs";
import { usePlaylists, type Playlist } from "@/hooks/usePlaylists";
import { useCachedList } from "@/lib/library-cache";

type Props = {
    playlist: Playlist;
    onBack: () => void;
    onPlayList: (list: Track[], index: number) => void;
    currentId?: string | null;
    actions: TrackActions;
};

// What the user asked to remove, waiting for confirmation.
type PendingRemoval = {
    track: Track;
    position: number;
};

// Returns a shuffled copy, so the stored order is not changed.
function shuffled<T>(list: T[]): T[] {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function PlaylistDetail({
    playlist,
    onBack,
    onPlayList,
    currentId,
    actions,
}: Props) {
    const { renamePlaylist, deletePlaylist, removeSong } = usePlaylists();

    const { items, loading, error } = useCachedList<Track>(
        `playlist-tracks:${playlist.id}`,
        0,
        () => GetPlaylistTracks(playlist.id),
    );

    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

    return (
        <div>
            {/* Header */}
            <div className="bg-black px-6 pb-6 pt-4 text-white">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex m-6 top-6 left-6 z-10 rounded-full text-black bg-background px-4 py-2 font-extrabold shadow hover:bg-muted"
                >
                    ← Back
                </button>

                <div className="text-xs font-semibold uppercase text-neutral-400">Playlist</div>
                <h2 className="mt-1 truncate text-4xl font-bold">{playlist.name}</h2>
                <div className="mt-2 text-sm text-neutral-300">
                    {items.length} {items.length === 1 ? "song" : "songs"}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            if (items.length) onPlayList(items, 0);
                        }}
                        disabled={!items.length}
                        className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 font-semibold text-black transition hover:scale-105 disabled:opacity-40"
                    >
                        <svg viewBox="0 0 24 24" className="size-5 fill-current">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Play all
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (items.length) onPlayList(shuffled(items), 0);
                        }}
                        disabled={!items.length}
                        className="rounded-full border border-neutral-500 px-5 py-2.5 text-sm font-semibold hover:border-white disabled:opacity-40"
                    >
                        Shuffle
                    </button>

                    <button
                        type="button"
                        onClick={() => setRenaming(true)}
                        className="rounded-full px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/10 hover:text-white"
                    >
                        Rename
                    </button>

                    <button
                        type="button"
                        onClick={() => setDeleting(true)}
                        className="rounded-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/10"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {/* Songs */}
            <div className="p-4">
                {error && <p className="p-4 text-(--app-danger)">Failed to load songs: {error}</p>}

                {loading && items.length === 0 && (
                    <p className="p-4 text-(--app-text-muted)">Loading songs…</p>
                )}

                {!loading && items.length === 0 && !error && (
                    <p className="p-4 text-(--app-text-muted)">
                        This playlist is empty. Use the ⋮ menu on a song to add it here.
                    </p>
                )}

                {items.length > 0 && (
                    <ListUi<Track>
                        items={items}
                        onPlay={onPlayList}
                        currentId={currentId}
                        renderMenu={(item) => (
                            // Stop clicks here from reaching the row, so opening the menu
                            // or pressing ✕ doesn't also start playback. React portals
                            // (the track menu panel) bubble through this wrapper too.
                            <div
                                className="flex shrink-0 items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <TrackMenu track={item} actions={actions} />

                                <button
                                    type="button"
                                    title="Remove from playlist"
                                    aria-label="Remove from playlist"
                                    onClick={() => {
                                        const position = items.indexOf(item);
                                        if (position >= 0) {
                                            setPendingRemoval({ track: item, position });
                                        }
                                    }}
                                    className="rounded-full p-2 text-(--app-text-muted) hover:bg-muted hover:text-black"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    />
                )}
            </div>

            {renaming && (
                <PromptDialog
                    title="Rename playlist"
                    initialValue={playlist.name}
                    submitLabel="Save"
                    onClose={() => setRenaming(false)}
                    onSubmit={async (name) => {
                        await renamePlaylist(playlist.id, name);
                        setRenaming(false);
                    }}
                />
            )}

            {deleting && (
                <ConfirmDialog
                    title="Delete playlist?"
                    message={`"${playlist.name}" will be deleted. The songs stay in your library.`}
                    confirmLabel="Delete"
                    onClose={() => setDeleting(false)}
                    onConfirm={async () => {
                        await deletePlaylist(playlist.id);
                        onBack();
                    }}
                />
            )}

            {pendingRemoval && (
                <ConfirmDialog
                    title="Remove from playlist?"
                    message={`"${pendingRemoval.track.title}" will be removed from "${playlist.name}". The song stays in your library.`}
                    confirmLabel="Remove"
                    onClose={() => setPendingRemoval(null)}
                    onConfirm={async () => {
                        await removeSong(playlist.id, pendingRemoval.position);
                        setPendingRemoval(null);
                    }}
                />
            )}
        </div>
    );
}
