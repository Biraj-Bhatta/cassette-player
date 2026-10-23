// db/playlists.go
package db

import (
	"context"
	"database/sql"
	"github.com/google/uuid"  // Generate uuid [To lazy to generate own uuid infact: idk how!! :) ]
	"errors"

)

// Playlist is one playlist with its song count, for the playlists grid.
type Playlist struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SongCount int    `json:"songCount"`
}

// ListPlaylists returns every playlist with its song count, sorted by name.
func ListPlaylists(ctx context.Context, conn *sql.DB) ([]Playlist, error) {
	rows, err := conn.QueryContext(ctx, `
		SELECT p.id, p.name, COUNT(ps.song_id) AS song_count
		FROM playlists p
		LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
		GROUP BY p.id, p.name
		ORDER BY p.name COLLATE NOCASE, p.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Playlist{} // empty slice, so the frontend gets [] instead of null
	for rows.Next() {
		var p Playlist
		if err := rows.Scan(&p.ID, &p.Name, &p.SongCount); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}




func CreatePlaylist(ctx context.Context, db *sql.DB, name string) (string, error) {
	id := uuid.NewString()
	_, err := db.ExecContext(ctx,
		`INSERT INTO playlists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		id, name, now(), now())
	return id, err
}

func RenamePlaylist(ctx context.Context, db *sql.DB, playlistID, name string) error {
	_, err := db.ExecContext(ctx,
		`UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?`,
		name, now(), playlistID)
	return err
}

func DeletePlaylist(ctx context.Context, db *sql.DB, playlistID string) error {
	_, err := db.ExecContext(ctx, `DELETE FROM playlists WHERE id = ?`, playlistID)
	return err
}




// ErrAlreadyInPlaylist is returned when the song is already in the playlist.
var ErrAlreadyInPlaylist = errors.New("this song is already in the playlist")

// AddSongToPlaylist appends a song to the end of a playlist.
// It refuses the song if it is already there.
func AddSongToPlaylist(ctx context.Context, conn *sql.DB, playlistID, songID string) error {
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // does nothing after a successful commit

	var exists bool
	if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM playlist_songs
			WHERE playlist_id = ? AND song_id = ?
		)`, playlistID, songID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return ErrAlreadyInPlaylist
	}

	var next int
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(position) + 1, 0)
		FROM playlist_songs
		WHERE playlist_id = ?`, playlistID).Scan(&next); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO playlist_songs (playlist_id, position, song_id)
		VALUES (?, ?, ?)`, playlistID, next, songID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE playlists SET updated_at = strftime('%s','now')
		WHERE id = ?`, playlistID); err != nil {
		return err
	}

	return tx.Commit()
}


func RemoveSongFromPlaylist(ctx context.Context, db *sql.DB, playlistID string, position int) error {
	_, err := db.ExecContext(ctx,
		`DELETE FROM playlist_songs WHERE playlist_id = ? AND position = ?`,
		playlistID, position)
	return err
}

// PlaylistSongIDs returns song IDs in playlist order.
func PlaylistSongIDs(ctx context.Context, db *sql.DB, playlistID string) ([]string, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY position`,
		playlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

