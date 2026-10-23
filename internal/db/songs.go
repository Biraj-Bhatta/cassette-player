package db

import (
	"context"
	"database/sql"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// insertSongs writes songs inside an existing transaction.
// ON CONFLICT updates a song that is already saved, so rescanning refreshes its metadata.
func insertSongs(ctx context.Context, tx *sql.Tx, tracks []model.Track) error {
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO songs_meta (id, path, title, album_id, total_duration, container, codec, thumbnail)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title          = excluded.title,
			album_id       = excluded.album_id,
			total_duration = excluded.total_duration,
			container      = excluded.container,
			codec          = excluded.codec,
			thumbnail      = excluded.thumbnail`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, t := range tracks {
		var albumRef any // nil becomes SQL NULL
		if t.Album != "" {
			albumRef = model.AlbumID(t.Album)
		}
		if _, err := stmt.ExecContext(ctx,
			model.SongID(t.Path), t.Path, t.Title, albumRef,
			int64(t.TotalDuration), t.Container, t.Codec, t.Thumbnail,
		); err != nil {
			return err
		}
	}
	return nil
}

// ListSongsInAlbum returns the songs on one album, sorted by title.
func ListSongsInAlbum(ctx context.Context, conn *sql.DB, albumID string) ([]model.Song, error) {
	rows, err := conn.QueryContext(ctx, `
		SELECT id, path, title, total_duration
		FROM songs_meta
		WHERE album_id = ?
		ORDER BY title COLLATE NOCASE`, albumID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.Song
	for rows.Next() {
		var s model.Song
		if err := rows.Scan(&s.ID, &s.Path, &s.Title, &s.Duration); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
