export interface Track {
    id: string;
    path: string;
    title: string;
    artist: string;
    album: string;
    duration: number; // nanoseconds, from Go's time.Duration
    albumArtist: string;
    container: string;
    codec: string;
    thumbnail: string;
}


export type Album = {
    id: string;
    title: string;
    albumArtist: string;
    thumbnail: string;
    songCount: number;
};

export type PlaylistOption = {
    id: string;
    name: string;
};

export type TrackMenuTrack = {
    id: string;
    artist?: string; // raw comma-separated tag, e.g. "A, B"
    album?: string;
};

// The minimum a track needs for its menu. Track satisfies this automatically.
export type TrackRef = {
    id: string;
    artist?: string; // raw comma-separated tag, e.g. "A, B"
    album?: string;
};

// Every handler the track menu can call. Built once in useTrackActions.
export type TrackActions = {
    playlists: PlaylistOption[];
    isFavourite: (trackId: string) => boolean;
    onAddToPlaylist: (playlistId: string, track: TrackRef) => void;
    onCreatePlaylist: (track: TrackRef) => void;
    onToggleFavourite: (track: TrackRef) => void;
    onGoToArtist: (artistName: string) => void;
    onGoToAlbum: (track: TrackRef) => void;
    onGoToFavourites: () => void;
    onDeleteFromLibrary: (track: TrackRef) => void; // new
};
