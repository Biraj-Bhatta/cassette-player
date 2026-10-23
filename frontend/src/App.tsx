// App.tsx
import { useEffect,useRef, useState } from "react";
import { GetAlbumByTitle, GetArtists } from "@wails/go/main/App";

import SettingsScreen from "@/components/custom-ui/settings/settings-screen";
import { GetSettings } from "@wails/go/main/App";

// Component imports
import { DeleteSongFromLibrary } from "@wails/go/main/App";
import { ConfirmDialog } from "@/components/custom-ui/common/dialogs";
import { clearCache } from "@/lib/library-cache";


import PlaylistsScreen from "@/components/custom-ui/playlists/playlists-screen";
import { PromptDialog } from "@/components/custom-ui/common/dialogs";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { TrackRef } from "@/types/model";
import { Toaster } from "@/lib/toast";

import { SearchPanel } from "@/components/custom-ui/landingPage/search-panel";
import type { SearchField } from "@/components/custom-ui/landingPage/search-filter";

import DownloadsPage from "@/components/custom-ui/downloads/download-screen";
import AlbumsScreen from "@/components/custom-ui/albumbs/album-screen";
import ArtistDetail from "@/components/custom-ui/artists/artist-detail";
import ArtistsList from "@/components/custom-ui/artists/artists-list";
import FavouritesScreen from "@/components/custom-ui/favorites/favoutites-screen";
import { AppMenu, type View } from "@/components/custom-ui/landingPage/menu";
import SongList from "@/components/custom-ui/allSongs/all-songs";
import { PlayerBar } from "@/components/custom-ui/common/player-bar";
import ScanButton from "@/components/custom-ui/common/scan-button";
import type { ArtistOption } from "@/components/custom-ui/albumbs/artist-grid";

// Hooks import
import { usePlayer } from "./hooks/usePlayer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCursorMode } from "@/hooks/useCursorMode";
import { useTrackActions } from "./hooks/useTrackActions";
import { getOrFetch } from "@/lib/library-cache";
import type { Album } from "@/types/model";

// Same rule as the backend: trim, collapse spaces, ignore case.
const normName = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export default function App() {
    // ===== Navigation =====
    const [view, setView] = useState<View>("songs");
    const [selectedArtist, setSelectedArtist] = useState<ArtistOption | null>(null);

    const [pendingDelete, setPendingDelete] = useState<TrackRef | null>(null);

    // Album to open on the albums screen, set by "Go to album".
    const [pendingAlbum, setPendingAlbum] = useState<Album | null>(null);

    // Sidebar navigation: also clears any pending album so it doesn't reopen later.
    const navigate = (next: View) => {
        setPendingAlbum(null);
        setView(next);
    };

    // ===== Search =====
    const [query, setQuery] = useState("");
    const [field, setField] = useState<SearchField>("all");



    // ===== Playback =====
    const player = usePlayer();

    // ===== Track menu actions =====

    const { playlists, addSong, createPlaylist } = usePlaylists();
    // Track waiting for a new playlist, set by "Create playlist" in the track menu.
    const [newPlaylistFor, setNewPlaylistFor] = useState<TrackRef | null>(null);


    // Apply the saved default volume once, at startup.
    useEffect(() => {
        GetSettings()
            .then((s) => player.handleVolumeChange(s.defaultVolume / 100))
            .catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const trackActions = useTrackActions({
        onGoToFavourites: () => navigate("favorites"),

        // Find the artist in the cached list by name, then open their page.
        onGoToArtist: async (artistName) => {
            try {
                const artists = await getOrFetch<ArtistOption>("artists", () =>
                    GetArtists() as Promise<ArtistOption[]>,
                );
                const found = artists.find((a) => normName(a.name) === normName(artistName));
                if (!found) {
                    console.warn("artist not found:", artistName);
                    return;
                }
                setSelectedArtist(found);
                navigate("artists");
            } catch (err) {
                console.error("go to artist failed:", err);
            }
        },

        // Look the album up by title, then open it on the albums screen.
        onGoToAlbum: async (track) => {
            if (!track.album) return;
            try {
                const album = await GetAlbumByTitle(track.album);
                setPendingAlbum(album as Album);
                setView("albums");
            } catch (err) {
                console.error("go to album failed:", err);
            }
        },

        playlists,
        onAddToPlaylist: addSong,
        onRequestNewPlaylist: (track) => setNewPlaylistFor(track),
        onRequestDeleteFromLibrary: (track) => setPendingDelete(track),


    });

    // ===== Keyboard and cursor =====
    const playerRef = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    useKeyboardShortcuts(
        {
            togglePlay: player.togglePlay,
            seekBy: player.seekBy,
            changeVolume: player.changeVolumeFromScroll,
        },
        playerRef,
    );

    useCursorMode();

    const currentId = player.current?.id ?? null;

    return (
        <div className="flex bg-backgroundWhite h-screen flex-col text-black">
            {/* One audio element for the whole app. It stays mounted across views. */}
            <audio
                ref={player.audioRef}
                preload="none"
                onPlay={() => player.setPlaying(true)}
                onPause={() => player.setPlaying(false)}
                onEnded={player.handleEnded}
                onTimeUpdate={(e) => player.setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => player.setDuration(e.currentTarget.duration)}
            />

            <div className="bg-backgroundWhite flex min-h-0 flex-1">
                <AppMenu currentView={view} onNavigate={navigate} />

                <main className="flex min-w-0 flex-1 flex-col">
                    <header className="flex border-b border-zinc-800 p-3">
                        <h1 className="text-center text-lg font-semibold capitalize">
                            {view.replace("-", " ")}
                        </h1>



                        <div className="mx-auto mt-3 w-full max-w-lg">
                            <SearchPanel
                                query={query}
                                onQueryChange={setQuery}
                                field={field}
                                onFieldChange={setField}
                                onPlayList={player.playList}
                                onOpenArtist={(artist) => {
                                    setSelectedArtist(artist);
                                    navigate("artists");
                                }}
                                onOpenAlbum={(album) => {
                                    setPendingAlbum(album);
                                    setView("albums");
                                }}
                            />
                        </div>


                        <div className="flex">
                            <ScanButton />
                        </div>
                    </header>

                    <div ref={mainScrollRef} className="flex-1 p-4 overflow-auto">

                        {view === "songs" && (
                            <SongList
                                onPlay={player.playList}
                                currentId={currentId}
                                actions={trackActions}
                            />
                        )}

                        {view === "artists" &&
                            (selectedArtist ? (
                                <ArtistDetail
                                    artist={selectedArtist}
                                    onBack={() => setSelectedArtist(null)}
                                    onPlayQueue={player.playList}
                                    currentId={currentId}
                                    actions={trackActions}
                                />
                            ) : (
                                    <ArtistsList onSelect={setSelectedArtist} />
                                ))}

                        {view === "albums" && (
                            <AlbumsScreen
                                onPlayList={player.playList}
                                actions={trackActions}
                                scrollRef={mainScrollRef}
                                initialAlbum={pendingAlbum}
                            />
                        )}



                        {view === "playlists" && (
                            <PlaylistsScreen
                                onPlayList={player.playList}
                                currentId={currentId}
                                actions={trackActions}
                            />
                        )}



                        {view === "favorites" && (
                            <FavouritesScreen
                                onPlayList={player.playList}
                                currentId={currentId}
                                actions={trackActions}
                            />
                        )}

                        {view === "downloads" && <DownloadsPage />}

                        {view === "settings" && <SettingsScreen />}
                    </div>
                </main>
            </div>


            {newPlaylistFor && (
                <PromptDialog
                    title="New playlist"
                    submitLabel="Create"
                    onClose={() => setNewPlaylistFor(null)}
                    onSubmit={async (name) => {
                        const id = await createPlaylist(name);
                        await addSong(id, newPlaylistFor.id);
                        setNewPlaylistFor(null);
                    }}
                />
            )}

            {pendingDelete && (
                <ConfirmDialog
                    title="Delete from library?"
                    message="This removes the song from your library, its playlists, and your favourites. The audio file on your computer is not deleted."
                    confirmLabel="Delete"
                    onClose={() => setPendingDelete(null)}
                    onConfirm={async () => {
                        await DeleteSongFromLibrary(pendingDelete.id);
                        clearCache();
                        setPendingDelete(null);
                    }}
                />
            )}


            <div ref={playerRef}>
                <PlayerBar
                    track={player.current}
                    playing={player.playing}
                    shuffle={player.shuffle}
                    repeat={player.repeat}
                    time={player.time}
                    duration={player.duration}
                    volume={player.volume}
                    onTogglePlay={player.togglePlay}
                    onNext={player.next}
                    onPrev={player.prev}
                    onToggleShuffle={player.toggleShuffle}
                    onToggleRepeat={player.toggleRepeat}
                    onSeek={player.handleSeek}
                    onVolumeChange={player.handleVolumeChange}
                />
            </div>


            {/* toster */}
            <div>
                <Toaster />
            </div>

        </div>
    );
}
