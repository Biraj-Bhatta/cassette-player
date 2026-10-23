// favourites/favourites-screen.tsx
import { GetFavouriteTracks } from "@wails/go/main/App";
import type { Track, TrackActions } from "@/types/model";
import ListUi from "@/components/custom-ui/common/list-ui";
import FavouritesState from "@/components/custom-ui/favorites/favourites-state";
import { invalidateCache, useCachedList } from "@/lib/library-cache";
import { useBlockingScan } from "@/lib/scan-state";

type Props = {
    onPlayList: (list: Track[], index: number) => void;
    currentId?: string | null;
    actions: TrackActions;
};

export default function FavouritesScreen({ onPlayList, currentId, actions }: Props) {
    // Cached under "favourites". Toggling a favourite clears this key.
    const { items, loading, error } = useCachedList<Track>(
        "favourites",
        0,
        () => GetFavouriteTracks(),
    );
    const scanning = useBlockingScan();

    // Picks one state at a time. The list is shown only when there is something to show.
    const renderBody = () => {
        if (error) {
            return (
                <FavouritesState
                    type="error"
                    message={`Failed to load favourites: ${error}`}
                    onRetry={() => invalidateCache("favourites")}
                />
            );
        }
        if (items.length === 0) {
            if (scanning) return <FavouritesState type="scanning" />;
            if (loading) return <FavouritesState type="loading" />;
            return <FavouritesState type="empty" />;
        }

        return (
            <div className="p-4">
                <ListUi<Track>
                    items={items}
                    onPlay={onPlayList}
                    currentId={currentId}
                    actions={actions}
                />
            </div>
        );
    };

    return (
        <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-4 px-6 pt-6">
                <div>
                    <div className="text-xs font-semibold uppercase text-(--app-text-muted)">
                        Playlist
                    </div>
                    <h2 className="mt-1 text-3xl font-bold text-foreground">Favourites</h2>
                    {items.length > 0 && (
                        <p className="mt-1 text-sm text-(--app-text-muted)">
                            {items.length} {items.length === 1 ? "song" : "songs"}
                        </p>
                    )}
                </div>

                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onPlayList(items, 0)}
                        aria-label="Play all favourites"
                        className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
                    >
                        <svg viewBox="0 0 24 24" className="size-5 fill-current">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Play all
                    </button>
                )}
            </div>

            {renderBody()}
        </div>
    );
}
