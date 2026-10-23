// db/playlist-tracks.go
package db

import (
	"context"
	"database/sql"
	"time"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// PlaylistTracks returns the songs of one playlist in playlist order.
func PlaylistTracks(ctx context.Context, conn *sql.DB, playlistID string) ([]model.Track, error) {
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
		FROM playlist_songs ps
		JOIN songs_meta s ON s.id = ps.song_id
		LEFT JOIN albums al ON al.id = s.album_id
		WHERE ps.playlist_id = ?
		ORDER BY ps.position`, playlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []model.Track{}
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
