package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// GetTracks returns one page of tracks, sorted by artist, album, and title.
// Artists come from song_artists, and the album title comes from albums.
func GetTracks(ctx context.Context, conn *sql.DB, offset, limit int) ([]model.Track, error) {
	offset, limit = clampPage(offset, limit)

	rows, err := conn.QueryContext(ctx, `
		SELECT
			s.id,
			s.path,
			s.title,
			COALESCE((
				SELECT group_concat(a.name, ', ')
				FROM song_artists sa
				JOIN artists a ON a.id = sa.artist_id
				WHERE sa.song_id = s.id
			), '') AS artist,
			COALESCE(al.title, '') AS album,
			s.total_duration,
			s.container,
			s.codec,
			s.thumbnail
		FROM songs_meta s
		LEFT JOIN albums al ON al.id = s.album_id
		ORDER BY artist COLLATE NOCASE, album COLLATE NOCASE, s.title COLLATE NOCASE, s.id
		LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []model.Track{} // empty slice, so the frontend gets [] instead of null
	for rows.Next() {
		var t model.Track
		var dur int64
		if err := rows.Scan(&t.ID, &t.Path, &t.Title, &t.Artist, &t.Album,
			&dur, &t.Container, &t.Codec, &t.Thumbnail); err != nil {
			return nil, err
		}
		t.TotalDuration = time.Duration(dur)
		tracks = append(tracks, t)
	}
	return tracks, rows.Err()
}
