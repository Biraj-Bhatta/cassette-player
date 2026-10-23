// hooks/usePlaylists.ts
import {
    AddSongToPlaylist,
    CreatePlaylist,
    DeletePlaylist,
    GetPlaylists,
    RemoveSongFromPlaylist,
    RenamePlaylist,
} from "@wails/go/main/App";
import type { db } from "@wails/go/models";
import { invalidateCache, useCachedList } from "@/lib/library-cache";

// Same shape as the Go struct, so it can't drift apart.
export type Playlist = db.Playlist;

const LIST_KEY = "playlists";
const tracksKey = (id: string) => `playlist-tracks:${id}`;


// True when the backend refused the song because it is already in the playlist.
export function isAlreadyInPlaylistError(err: unknown): boolean {
    return String(err).includes("already in the playlist");
}

export function usePlaylists() {
    const { items: playlists, loading, error } = useCachedList<Playlist>(
        LIST_KEY,
        0,
        () => GetPlaylists(),
    );

    // Clears the playlist list and, when given, one playlist's songs.
    const refresh = (playlistId?: string) => {
        invalidateCache(LIST_KEY);
        if (playlistId) invalidateCache(tracksKey(playlistId));
    };

    return {
        playlists,
        loading,
        error,

        createPlaylist: async (name: string) => {
            const id = await CreatePlaylist(name);
            refresh();
            return id;
        },

        renamePlaylist: async (id: string, name: string) => {
            await RenamePlaylist(id, name);
            refresh(id);
        },

        deletePlaylist: async (id: string) => {
            await DeletePlaylist(id);
            refresh(id);
        },

        addSong: async (playlistId: string, songId: string) => {
            await AddSongToPlaylist(playlistId, songId);
            refresh(playlistId);
        },

        removeSong: async (playlistId: string, position: number) => {
            await RemoveSongFromPlaylist(playlistId, position);
            refresh(playlistId);
        },
    };
}
