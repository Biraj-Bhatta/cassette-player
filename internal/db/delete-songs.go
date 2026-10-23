// db/delete-song.go
package db

import (
	"context"
	"database/sql"
)

// DeleteSongFromLibrary removes a song's rows from the database: its artist links,
// favourites, and playlist entries. The audio file on disk is never touched.
func DeleteSongFromLibrary(ctx context.Context, conn *sql.DB, songID string) error {
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // does nothing after a successful commit

	// Find the playlists that contain this song before its rows are removed.
	playlistIDs, err := playlistsWithSong(ctx, tx, songID)
	if err != nil {
		return err
	}

	// Delete explicitly rather than relying on ON DELETE CASCADE.
	for _, stmt := range []string{
		`DELETE FROM playlist_songs WHERE song_id = ?`,
		`DELETE FROM favourites WHERE song_id = ?`,
		`DELETE FROM song_artists WHERE song_id = ?`,
		`DELETE FROM songs_meta WHERE id = ?`,
	} {
		if _, err := tx.ExecContext(ctx, stmt, songID); err != nil {
			return err
		}
	}

	// Close the gap left in each affected playlist, so positions stay 0..n-1.
	for _, pid := range playlistIDs {
		if err := renumberPlaylist(ctx, tx, pid); err != nil {
			return err
		}
	}

	// Remove albums and artists that no longer have any songs.
	for _, stmt := range []string{
		`DELETE FROM albums
		WHERE NOT EXISTS (SELECT 1 FROM songs_meta s WHERE s.album_id = albums.id)`,
		`DELETE FROM artists
		WHERE NOT EXISTS (SELECT 1 FROM song_artists sa WHERE sa.artist_id = artists.id)`,
	} {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func playlistsWithSong(ctx context.Context, tx *sql.Tx, songID string) ([]string, error) {
	rows, err := tx.QueryContext(ctx,
		`SELECT DISTINCT playlist_id FROM playlist_songs WHERE song_id = ?`, songID)
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

// renumberPlaylist rewrites one playlist's positions as 0, 1, 2, ... in their current order.
func renumberPlaylist(ctx context.Context, tx *sql.Tx, playlistID string) error {
	type entry struct {
		songID  string
		addedAt int64
	}

	rows, err := tx.QueryContext(ctx,
		`SELECT song_id, added_at FROM playlist_songs
		WHERE playlist_id = ? ORDER BY position`, playlistID)
	if err != nil {
		return err
	}
	var entries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.songID, &e.addedAt); err != nil {
			rows.Close()
			return err
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close() // must close before writing on the same transaction

	if _, err := tx.ExecContext(ctx,
		`DELETE FROM playlist_songs WHERE playlist_id = ?`, playlistID); err != nil {
		return err
	}
	for i, e := range entries {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO playlist_songs (playlist_id, position, song_id, added_at)
			VALUES (?, ?, ?, ?)`, playlistID, i, e.songID, e.addedAt); err != nil {
			return err
		}
	}
	return nil
}
