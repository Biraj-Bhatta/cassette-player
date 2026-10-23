package db

import (
	"context"
	"database/sql"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

const (
	defaultPageSize = 60
	maxPageSize     = 200
)

// insertAlbums writes albums inside an existing transaction.
func insertAlbums(ctx context.Context, tx *sql.Tx, albums map[string]model.Album) error {
	stmt, err := tx.PrepareContext(ctx,
		`INSERT OR IGNORE INTO albums (id, title, album_artist) VALUES (?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, al := range albums {
		if _, err := stmt.ExecContext(ctx, al.ID, al.Title, al.AlbumArtist); err != nil {
			return err
		}
	}
	return nil
}





// clampPage keeps offset and limit in a safe range.
func clampPage(offset, limit int) (int, int) {
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 || limit > maxPageSize {
		limit = defaultPageSize
	}
	return offset, limit
}

// ListAlbums returns one page of albums that have at least one song, sorted by title.
func ListAlbums(ctx context.Context, conn *sql.DB, offset, limit int) ([]model.Album, error) {
	offset, limit = clampPage(offset, limit)

	rows, err := conn.QueryContext(ctx, `
		SELECT al.id, al.title, al.album_artist,
		`+albumThumbnailSQL+`,
		`+albumCountSQL+`
		FROM albums al
		WHERE EXISTS (SELECT 1 FROM songs_meta s WHERE s.album_id = al.id)
		ORDER BY al.title COLLATE NOCASE, al.id
		LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, err
	}
	return scanAlbums(rows)
}

// ListAlbumsByArtist returns one page of albums that have at least one song by this artist.
func ListAlbumsByArtist(ctx context.Context, conn *sql.DB, artistID string, offset, limit int) ([]model.Album, error) {
	offset, limit = clampPage(offset, limit)

	rows, err := conn.QueryContext(ctx, `
		SELECT DISTINCT al.id, al.title, al.album_artist,
		`+albumThumbnailSQL+`,
		`+albumCountSQL+`
		FROM albums al
		JOIN songs_meta s    ON s.album_id = al.id
		JOIN song_artists sa ON sa.song_id = s.id
		WHERE sa.artist_id = ?
		ORDER BY al.title COLLATE NOCASE, al.id
		LIMIT ? OFFSET ?`, artistID, limit, offset)
	if err != nil {
		return nil, err
	}
	return scanAlbums(rows)
}








// albumThumbnailSQL takes the cover from the first song in the album that has one.
// Returns '' when no song has cover art.
const albumThumbnailSQL = `COALESCE((
	SELECT s.thumbnail FROM songs_meta s
	WHERE s.album_id = al.id AND s.thumbnail <> ''
	ORDER BY s.title COLLATE NOCASE
	LIMIT 1), '')`


const albumCountSQL = `(SELECT COUNT(*) FROM songs_meta s WHERE s.album_id = al.id)`

const albumSummarySQL = `
	SELECT al.id, al.title, al.album_artist,
	` + albumThumbnailSQL + `,
	` + albumCountSQL + `
	FROM albums al`

func scanAlbums(rows *sql.Rows) ([]model.Album, error) {
	defer rows.Close()

	out := []model.Album{}
	for rows.Next() {
		var al model.Album
		if err := rows.Scan(&al.ID, &al.Title, &al.AlbumArtist, &al.Thumbnail, &al.SongCount); err != nil {
			return nil, err
		}
		out = append(out, al)
	}
	return out, rows.Err()
}





// ListSongsByAlbum returns the songs of one album, sorted by title.
// Each song includes its artists, joined with ", ".
func ListSongsByAlbum(ctx context.Context, conn *sql.DB, albumID string) ([]model.Track, error) {
	rows, err := conn.QueryContext(ctx, `
		SELECT s.id, s.path, s.title, al.title,
		       COALESCE((
		           SELECT GROUP_CONCAT(ar.name, ', ')
		           FROM song_artists sa
		           JOIN artists ar ON ar.id = sa.artist_id
		           WHERE sa.song_id = s.id
		       ), '') AS artist,
		       s.total_duration, s.thumbnail, s.codec, s.container
		FROM songs_meta s
		JOIN albums al ON al.id = s.album_id
		WHERE s.album_id = ?
		ORDER BY s.title COLLATE NOCASE`, albumID)
	if err != nil {
		return nil, err
	}
	return scanSongs(rows)
}

func scanSongs(rows *sql.Rows) ([]model.Track, error) {
	defer rows.Close()

	out := []model.Track{}
	for rows.Next() {
		var s model.Track
		if err := rows.Scan(
			&s.ID,
			&s.Path,
			&s.Title,
			&s.Album,
			&s.Artist,
			&s.TotalDuration,
			&s.Thumbnail,
			&s.Codec,
			&s.Container,
		); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}



// GetAlbumByTitle returns the album for a title, using the same ID rule as SaveBatch.
func GetAlbumByTitle(ctx context.Context, conn *sql.DB, title string) (model.Album, error) {
	var al model.Album
	err := conn.QueryRowContext(ctx, `
		SELECT al.id, al.title, al.album_artist,
		       `+albumThumbnailSQL+`,
		       `+albumCountSQL+`
		FROM albums al
		WHERE al.id = ?`, model.AlbumID(title)).
		Scan(&al.ID, &al.Title, &al.AlbumArtist, &al.Thumbnail, &al.SongCount)
	return al, err
}

