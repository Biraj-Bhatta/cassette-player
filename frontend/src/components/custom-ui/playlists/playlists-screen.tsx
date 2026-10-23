// playlists/playlists-screen.tsx
import { useState } from "react";
import type { Track, TrackActions } from "@/types/model";
import { usePlaylists } from "@/hooks/usePlaylists";
import { PromptDialog } from "@/components/custom-ui/common/dialogs";
import PlaylistCard from "@/components/custom-ui/playlists/playlist-card";
import PlaylistDetail from "@/components/custom-ui/playlists/playlist-detail";
import PlaylistsState from "@/components/custom-ui/playlists/playlists-state";
import { invalidateCache } from "@/lib/library-cache";
import { useBlockingScan } from "@/lib/scan-state";

type Props = {
    onPlayList: (list: Track[], index: number) => void;
    currentId?: string | null;
    actions: TrackActions;
};

export default function PlaylistsScreen({ onPlayList, currentId, actions }: Props) {
    const { playlists, loading, error, createPlaylist } = usePlaylists();
    const scanning = useBlockingScan();
    const [openId, setOpenId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Open playlist, if it still exists. A deleted one falls back to the grid.
    const open = openId ? playlists.find((p) => p.id === openId) : undefined;

    if (open) {
        return (
            <PlaylistDetail
                playlist={open}
                onBack={() => setOpenId(null)}
                onPlayList={onPlayList}
                currentId={currentId}
                actions={actions}
            />
        );
    }

    // Picks one state at a time. The grid is shown only when there is something to show.
    const renderBody = () => {
        if (error) {
            return (
                <PlaylistsState
                    type="error"
                    message={`Failed to load playlists: ${error}`}
                    onRetry={() => invalidateCache("playlists")}
                />
            );
        }
        if (playlists.length === 0) {
            if (scanning || loading) return <PlaylistsState type="loading" />;
            return <PlaylistsState type="empty" />;
        }

        return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {playlists.map((p) => (
                    <PlaylistCard key={p.id} playlist={p} onOpen={() => setOpenId(p.id)} />
                ))}
            </div>
        );
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase text-(--app-text-muted)">
                        Library
                    </div>
                    <h2 className="mt-1 text-3xl font-bold text-foreground">Playlists</h2>
                    {playlists.length > 0 && (
                        <p className="mt-1 text-sm text-(--app-text-muted)">
                            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
                >
                    + New playlist
                </button>
            </div>

            {renderBody()}

            {creating && (
                <PromptDialog
                    title="New playlist"
                    submitLabel="Create"
                    onClose={() => setCreating(false)}
                    onSubmit={async (name) => {
                        await createPlaylist(name);
                        setCreating(false);
                    }}
                />
            )}
        </div>
    );
}
