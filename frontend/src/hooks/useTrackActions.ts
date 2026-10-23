// hooks/useTrackActions.ts
import { useEffect, useState } from "react";
import { AddFavourite, GetFavourites, RemoveFavourite } from "@wails/go/main/App";
import type { PlaylistOption, TrackActions, TrackRef } from "@/types/model";
import { invalidateCache } from "@/lib/library-cache";
import { isAlreadyInPlaylistError } from "@/hooks/usePlaylists";
import { toast } from "@/lib/toast";

export type TrackActionHandlers = {
    // Navigation (handled in App.tsx)
    onGoToFavourites: () => void;
    onGoToArtist: (artistName: string) => void;
    onGoToAlbum: (track: TrackRef) => void;

    // Playlists (from usePlaylists in App.tsx)
    playlists: PlaylistOption[];
    onAddToPlaylist: (playlistId: string, songId: string) => Promise<void>;
    // App opens the name dialog, creates the playlist, and adds the track.
    onRequestNewPlaylist: (track: TrackRef) => void;

    // App opens the confirmation dialog, then deletes the song.
    onRequestDeleteFromLibrary: (track: TrackRef) => void;
};

// Returned by the hook: the menu actions, plus a helper App uses after a delete.
export type TrackActionsWithHelpers = TrackActions & {
    forgetFavourite: (songId: string) => void;
};

export function useTrackActions({
    onGoToFavourites,
    onGoToArtist,
    onGoToAlbum,
    playlists,
    onAddToPlaylist,
    onRequestNewPlaylist,
    onRequestDeleteFromLibrary,
}: TrackActionHandlers): TrackActionsWithHelpers {
    const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());

    // Load saved favourites once, when the app starts.
    useEffect(() => {
        GetFavourites()
            .then((ids) => setFavouriteIds(new Set(ids ?? [])))
            .catch(console.error);
    }, []);

    const toggleFavourite = (track: TrackRef) => {
        const id = track.id;
        const wasFav = favouriteIds.has(id);

        // Update the UI right away.
        const apply = (add: boolean) =>
            setFavouriteIds((prev) => {
                const next = new Set(prev);
                if (add) next.add(id);
                    else next.delete(id);
                return next;
            });

        apply(!wasFav);

        const request = wasFav ? RemoveFavourite(id) : AddFavourite(id);
        request
            .then(() => invalidateCache("favourites"))
            .catch((err) => {
                console.error("favourite save failed:", err);
                apply(wasFav); // roll back
            });
    };

    // Removes a song from the local favourite set, for example after it is deleted.
    const forgetFavourite = (songId: string) =>
        setFavouriteIds((prev) => {
            if (!prev.has(songId)) return prev;
            const next = new Set(prev);
            next.delete(songId);
            return next;
        });

    return {
        // Playlists
        playlists,

        onAddToPlaylist: (playlistId, track) => {
            const name = playlists.find((p) => p.id === playlistId)?.name ?? "playlist";

            onAddToPlaylist(playlistId, track.id)
                .then(() => toast.success(`Added to “${name}”`))
                .catch((err) => {
                    if (isAlreadyInPlaylistError(err)) {
                        toast.info(`Already in “${name}”`);
                    } else {
                        console.error("add to playlist failed:", err);
                        toast.error(`Couldn't add to “${name}”`);
                    }
                });
        },

        onCreatePlaylist: (track) => onRequestNewPlaylist(track),

        // Favourites
        isFavourite: (trackId) => favouriteIds.has(trackId),
        onToggleFavourite: toggleFavourite,

        // Navigation
        onGoToArtist: (artistName) => onGoToArtist(artistName),
        onGoToAlbum: (track) => onGoToAlbum(track),
        onGoToFavourites,

        // Delete
        onDeleteFromLibrary: (track) => onRequestDeleteFromLibrary(track),

        // Helper
        forgetFavourite,
    };
}
