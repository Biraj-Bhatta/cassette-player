package main

import (
	"github.com/biraj-bhatta/cassette-player/internal/db"
	"github.com/biraj-bhatta/cassette-player/internal/model"
	"github.com/biraj-bhatta/cassette-player/internal/paths"
	"github.com/biraj-bhatta/cassette-player/internal/settings"
	"github.com/biraj-bhatta/cassette-player/internal/stream"
	"context"
	"database/sql"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"sync/atomic"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
	conn  *sql.DB

	scanning atomic.Bool
	stream *stream.Registry
}

// NewApp creates a new App application struct
// app.go (the constructor)
func NewApp(s *stream.Registry) *App {
	return &App{stream: s}
}




// startup is called when the app starts. The context is saved
// so we can call the runtime methods.
func (a *App) startup(ctx context.Context) {
	log.Println("startup: called")
	a.ctx = ctx

	dbPath, err := paths.DatabasePath()
	if err != nil {
		log.Println("database path error:", err)
		return
	}
	log.Println("database path:", dbPath)

	conn, err := db.Open(dbPath)
	if err != nil {
		log.Println("database error:", err)
		return
	}
	a.conn = conn
	log.Println("database ready")
}



// shutdown is called when the app closes.
func (a *App) shutdown(ctx context.Context) {
	log.Println("shutdown : called")
	if a.conn != nil {
		a.conn.Close()
	}
}




// // ScanFolder starts a background scan. It returns an error right away if it can't start.
// func (a *App) ScanFolder(dir string) error {
// 	log.Printf("ScanFolder: called with %q", dir)
//
// 	if a.conn == nil {
// 		return fmt.Errorf("database is not open")
// 	}
// 	if !a.scanning.CompareAndSwap(false, true) {
// 		log.Println("ScanFolder: refused, a scan is already running")
// 		return fmt.Errorf("a scan is already running")
// 	}
//
// 	go func() {
// 		defer a.scanning.Store(false)
// 		defer func() {
// 			if r := recover(); r != nil {
// 				log.Println("ScanFolder: PANIC:", r)
// 				runtime.EventsEmit(a.ctx, "scan:error", fmt.Sprint("scan crashed: ", r))
// 			}
// 		}()
//
// 		log.Println("ScanFolder: goroutine started")
// 		runtime.EventsEmit(a.ctx, "scan:started", dir)
//
// 		n, err := features.ScanAndSave(a.ctx, a.conn, dir, func(saved int) {
// 			log.Println("ScanFolder: progress", saved)
// 			runtime.EventsEmit(a.ctx, "scan:progress", saved)
// 		})
// 		if err != nil {
// 			log.Println("ScanFolder: error:", err)
// 			runtime.EventsEmit(a.ctx, "scan:error", err.Error())
// 			return
// 		}
// 		log.Println("ScanFolder: done, saved", n)
// 		runtime.EventsEmit(a.ctx, "scan:done", n)
// 	}()
//
// 	return nil
// }
//






// ========================== All Songs ===========================================

// GetTracks returns one page of songs for the All Songs screen.
func (a *App) GetTracks(offset, limit int) ([]model.Track, error) {
	return db.GetTracks(a.ctx, a.conn, offset, limit)
}

// ========================== Artists ===========================================

// GetArtists returns all artists sorted by name, for the artists screen.
func (a *App) GetArtists() ([]model.Artist, error) {
	artists, err := db.ListArtists(a.ctx, a.conn)
	if err != nil {
		return nil, err
	}
	if artists == nil {
		// Return an empty array rather than null so the frontend can map over it.
		artists = []model.Artist{}
	}
	return artists, nil
}


// GetSongsByArtist returns all songs for an artist, for the artist detail view.
func (a *App) GetSongsByArtist(artistID string) ([]model.Track, error) {
	tracks, err := db.ListTracksByArtist(a.ctx, a.conn, artistID)
	if err != nil {
		return nil, err
	}
	if tracks == nil {
		tracks = []model.Track{}
	}
	return tracks, nil
}


// ========================== Albumbs ===========================================
func (a *App) GetAlbums(offset, limit int) ([]model.Album, error) {
	return db.ListAlbums(a.ctx, a.conn, offset, limit)
}

func (a *App) GetAlbumsByArtist(artistID string, offset, limit int) ([]model.Album, error) {
	return db.ListAlbumsByArtist(a.ctx, a.conn, artistID, offset, limit)
}

// GetAlbumByTitle returns one album by its title, for "Go to album".
func (a *App) GetAlbumByTitle(title string) (model.Album, error) {
	return db.GetAlbumByTitle(a.ctx, a.conn, title)
}

// ListSongsByAlbum returns all songs belonging to the specified album.
func (a *App) ListSongsByAlbum(albumID string) ([]model.Track, error) {
	return db.ListSongsByAlbum(a.ctx, a.conn, albumID)
}



// ========================== Favourites ===========================================

// GetFavourites returns favourited song IDs, newest first.
func (a *App) GetFavourites() ([]string, error) {
	return db.ListFavourites(a.ctx, a.conn)
}

// GetFavouriteTracks returns the favourited songs for the Favourites screen.
func (a *App) GetFavouriteTracks() ([]model.Track, error) {
	return db.ListFavouriteTracks(a.ctx, a.conn)
}

func (a *App) AddFavourite(songID string) error {
	return db.AddFavourite(a.ctx, a.conn, songID)
}

func (a *App) RemoveFavourite(songID string) error {
	return db.RemoveFavourite(a.ctx, a.conn, songID)
}




// ========================== Playlists ===========================================

func (a *App) GetPlaylists() ([]db.Playlist, error) {
	return db.ListPlaylists(a.ctx, a.conn)
}

// GetPlaylistTracks returns the songs of a playlist, in order.
func (a *App) GetPlaylistTracks(playlistID string) ([]model.Track, error) {
	return db.PlaylistTracks(a.ctx, a.conn, playlistID)
}

// CreatePlaylist returns the new playlist's ID.
func (a *App) CreatePlaylist(name string) (string, error) {
	return db.CreatePlaylist(a.ctx, a.conn, name)
}

func (a *App) RenamePlaylist(playlistID, name string) error {
	return db.RenamePlaylist(a.ctx, a.conn, playlistID, name)
}

func (a *App) DeletePlaylist(playlistID string) error {
	return db.DeletePlaylist(a.ctx, a.conn, playlistID)
}

// GetPlaylistSongs returns song IDs in playlist order.
func (a *App) GetPlaylistSongs(playlistID string) ([]string, error) {
	return db.PlaylistSongIDs(a.ctx, a.conn, playlistID)
}

func (a *App) AddSongToPlaylist(playlistID, songID string) error {
	return db.AddSongToPlaylist(a.ctx, a.conn, playlistID, songID)
}

func (a *App) RemoveSongFromPlaylist(playlistID string, position int) error {
	return db.RemoveSongFromPlaylist(a.ctx, a.conn, playlistID, position)
}

// ========================== Search File ===========================================
// SearchLibrary returns dropdown matches. field is "all", "song", "artist", or "album".
func (a *App) SearchLibrary(query, field string, limit int) (db.SearchResults, error) {
	return db.Search(a.ctx, a.conn, query, field, limit)
}

// ========================== DeteteSongs From Library ===========================================

// DeleteSongFromLibrary removes a song from the library database only. The file on disk is kept.
func (a *App) DeleteSongFromLibrary(songID string) error {
	return db.DeleteSongFromLibrary(a.ctx, a.conn, songID)
}


// ========================== Settings ===========================================

// GetSettings returns the saved settings, or the defaults on first run.
func (a *App) GetSettings() (settings.Settings, error) {
	p, err := paths.SettingsPath()
	if err != nil {
		return settings.Default(), err
	}
	return settings.Load(p)
}

// SaveSettings writes the settings to disk.
func (a *App) SaveSettings(s settings.Settings) error {
	p, err := paths.SettingsPath()
	if err != nil {
		return err
	}
	return settings.Save(p, s)
}

// GetDataLocation returns the folder that holds the database and settings.
func (a *App) GetDataLocation() (string, error) {
	return paths.DataDir()
}

// ClearThumbnailCache deletes cached cover images on disk. Covers are
// regenerated on the next scan. Songs in the database are not changed.
func (a *App) ClearThumbnailCache() error {
	base, err := os.UserCacheDir()
	if err != nil {
		return err
	}
	return os.RemoveAll(filepath.Join(base, "cassette-player", "thumbs"))
}

// ==============================Scanning Folder Logic===================================



// PickFolder opens a native folder picker and returns the chosen path ("" if cancelled).
func (a *App) PickFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Choose your music folder",
	})
}




// // ScanAllFolders scans every music folder in the settings, one after another.
// func (a *App) ScanAllFolders() error {
// 	if a.conn == nil {
// 		return fmt.Errorf("database is not open")
// 	}
//
// 	s, err := a.GetSettings()
// 	if err != nil {
// 		return err
// 	}
// 	if len(s.MusicFolders) == 0 {
// 		return fmt.Errorf("no music folders set")
// 	}
// 	if !a.scanning.CompareAndSwap(false, true) {
// 		return fmt.Errorf("a scan is already running")
// 	}
//
// 	folders := s.MusicFolders
// 	go func() {
// 		defer a.scanning.Store(false)
// 		runtime.EventsEmit(a.ctx, "scan:started", "all folders")
//
// 		total := 0
// 		for _, dir := range folders {
// 			base := total // progress for this folder continues from the earlier ones
// 			n, err := features.ScanAndSave(a.ctx, a.conn, dir, func(saved int) {
// 				runtime.EventsEmit(a.ctx, "scan:progress", base+saved)
// 			})
// 			if err != nil {
// 				log.Println("ScanAllFolders: error in", dir, ":", err)
// 				runtime.EventsEmit(a.ctx, "scan:error", err.Error())
// 				return
// 			}
// 			total += n
// 		}
// 		runtime.EventsEmit(a.ctx, "scan:done", total)
// 	}()
//
// 	return nil
// }
//


// ========================== Audio File ===========================================

// GetAudioURL registers a song and returns an absolute URL on the local audio server.
func (a *App) GetAudioURL(songID, path string) (string, error) {
	if _, err := os.Stat(path); err != nil {
		return "", err
	}
	a.stream.Put(songID, path)
	return a.stream.BaseURL() + "/audio/" + url.PathEscape(songID), nil
}
