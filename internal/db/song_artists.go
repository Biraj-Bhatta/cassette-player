package db

import (
	"context"
	"time"
	"database/sql"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// insertSongArtists links songs to artists inside an existing transaction.
func insertSongArtists(ctx context.Context, tx *sql.Tx, links []model.SongArtist) error {
	stmt, err := tx.PrepareContext(ctx,
		`INSERT OR IGNORE INTO song_artists (song_id, artist_id) VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, l := range links {
		if _, err := stmt.ExecContext(ctx, l.SongID, l.ArtistID); err != nil {
			return err
		}
	}
	return nil
}


// ListTracksByArtist returns every song linked to the artist, as full Track objects.
func ListTracksByArtist(ctx context.Context, conn *sql.DB, artistID string) ([]model.Track, error) {
	rows, err := conn.QueryContext(ctx, `
		SELECT s.id,
		       s.path,
		       s.title,
		       COALESCE((SELECT GROUP_CONCAT(a2.name, ', ')
		                   FROM song_artists sa2
		                   JOIN artists a2 ON a2.id = sa2.artist_id
		                  WHERE sa2.song_id = s.id), ''),
		       COALESCE(al.title, ''),
		       s.total_duration,
		       s.container,
		       s.codec,
		       s.thumbnail
		  FROM songs_meta s
		  JOIN song_artists sa ON sa.song_id = s.id
		  LEFT JOIN albums al ON al.id = s.album_id
		 WHERE sa.artist_id = ?
		 ORDER BY s.title COLLATE NOCASE`,
		artistID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.Track
	for rows.Next() {
		var t model.Track
		var durationNs int64
		if err := rows.Scan(
			&t.ID, &t.Path, &t.Title, &t.Artist, &t.Album,
			&durationNs, &t.Container, &t.Codec, &t.Thumbnail,
		); err != nil {
			return nil, err
		}
		t.TotalDuration = time.Duration(durationNs)
		out = append(out, t)
	}
	return out, rows.Err()
}
