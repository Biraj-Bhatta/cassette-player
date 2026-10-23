// db/search.go
package db

import (
	"context"
	"database/sql"
	"sort"
	"strings"
	"time"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// fuzzyMin is the lowest score that still counts as a match.
// Raise it for stricter results, lower it for more typo tolerance.
const fuzzyMin = 25

// ArtistHit is one artist in the search dropdown.
type ArtistHit struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// SearchResults holds the matches for each group.
type SearchResults struct {
	Songs   []model.Track `json:"songs"`
	Artists []ArtistHit   `json:"artists"`
	Albums  []model.Album `json:"albums"`
}

type candidate struct {
	id    string
	score int
}

// Search returns fuzzy matches for the dropdown.
//   - "all":    songs (title, artist, album), artists, and albums
//   - "song":   songs by title, artist, or album
//   - "artist": artists only
//   - "album":  albums only
func Search(ctx context.Context, conn *sql.DB, query, field string, limit int) (SearchResults, error) {
	res := SearchResults{Songs: []model.Track{}, Artists: []ArtistHit{}, Albums: []model.Album{}}

	q := normalize(query)
	if q == "" {
		return res, nil
	}
	if limit <= 0 || limit > 50 {
		limit = 8
	}

	var err error
	if field == "all" || field == "song" {
		res.Songs, err = searchSongs(ctx, conn, q, field == "all", limit)
		if err != nil {
			return res, err
		}
	}
	if field == "all" || field == "artist" {
		res.Artists, err = searchArtists(ctx, conn, q, limit)
		if err != nil {
			return res, err
		}
	}
	if field == "all" || field == "album" {
		res.Albums, err = searchAlbums(ctx, conn, q, limit)
		if err != nil {
			return res, err
		}
	}
	return res, nil
}

// searchSongs scores songs in two steps. First it scores only the title, artist,
// and album text, so thumbnails aren't loaded for every song. Then it loads full
// rows for the best matches.
func searchSongs(ctx context.Context, conn *sql.DB, q string, anyField bool, limit int) ([]model.Track, error) {
	cands, err := scoreSongs(ctx, conn, q, anyField)
	if err != nil {
		return nil, err
	}
	return songsByIDs(ctx, conn, rank(cands, limit))
}

func scoreSongs(ctx context.Context, conn *sql.DB, q string, anyField bool) ([]candidate, error) {
	rows, err := conn.QueryContext(ctx, `
		SELECT s.id, s.title,
		       COALESCE((
		           SELECT group_concat(a.name, ', ')
		           FROM song_artists sa
		           JOIN artists a ON a.id = sa.artist_id
		           WHERE sa.song_id = s.id
		       ), ''),
		       COALESCE(al.title, '')
		FROM songs_meta s
		LEFT JOIN albums al ON al.id = s.album_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cands []candidate
	for rows.Next() {
		var id, title, artist, album string
		if err := rows.Scan(&id, &title, &artist, &album); err != nil {
			return nil, err
		}

		score := FuzzyScore(q, title)
		if anyField {
			// Title counts most, then artist, then album.
			score = maxOf(score,
				weight(FuzzyScore(q, artist), 90),
				weight(FuzzyScore(q, album), 80))
		}
		if score >= fuzzyMin {
			cands = append(cands, candidate{id: id, score: score})
		}
	}
	return cands, rows.Err()
}

// songsByIDs loads full track rows for the given IDs, in the same order.
func songsByIDs(ctx context.Context, conn *sql.DB, ids []string) ([]model.Track, error) {
	out := []model.Track{}
	if len(ids) == 0 {
		return out, nil
	}

	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}

	rows, err := conn.QueryContext(ctx, `
		SELECT s.id, s.path, s.title,
		       COALESCE((
		           SELECT group_concat(a.name, ', ')
		           FROM song_artists sa
		           JOIN artists a ON a.id = sa.artist_id
		           WHERE sa.song_id = s.id
		       ), ''),
		       COALESCE(al.title, ''),
		       s.total_duration, s.container, s.codec, s.thumbnail
		FROM songs_meta s
		LEFT JOIN albums al ON al.id = s.album_id
		WHERE s.id IN (`+placeholders(len(ids))+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := make(map[string]model.Track, len(ids))
	for rows.Next() {
		var t model.Track
		var dur int64
		if err := rows.Scan(&t.ID, &t.Path, &t.Title, &t.Artist, &t.Album,
			&dur, &t.Container, &t.Codec, &t.Thumbnail); err != nil {
			return nil, err
		}
		t.TotalDuration = time.Duration(dur)
		byID[t.ID] = t
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for _, id := range ids {
		if t, ok := byID[id]; ok {
			out = append(out, t)
		}
	}
	return out, nil
}

func searchArtists(ctx context.Context, conn *sql.DB, q string, limit int) ([]ArtistHit, error) {
	rows, err := conn.QueryContext(ctx, `SELECT id, name FROM artists`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cands []candidate
	names := map[string]string{}
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		if score := FuzzyScore(q, name); score >= fuzzyMin {
			cands = append(cands, candidate{id: id, score: score})
			names[id] = name
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := []ArtistHit{}
	for _, id := range rank(cands, limit) {
		out = append(out, ArtistHit{ID: id, Name: names[id]})
	}
	return out, nil
}

func searchAlbums(ctx context.Context, conn *sql.DB, q string, limit int) ([]model.Album, error) {
	rows, err := conn.QueryContext(ctx, `
		SELECT al.id, al.title, al.album_artist
		FROM albums al
		WHERE EXISTS (SELECT 1 FROM songs_meta s WHERE s.album_id = al.id)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cands []candidate
	for rows.Next() {
		var id, title, albumArtist string
		if err := rows.Scan(&id, &title, &albumArtist); err != nil {
			return nil, err
		}
		score := maxOf(FuzzyScore(q, title), weight(FuzzyScore(q, albumArtist), 80))
		if score >= fuzzyMin {
			cands = append(cands, candidate{id: id, score: score})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return albumsByIDs(ctx, conn, rank(cands, limit))
}

// albumsByIDs loads full album rows (with cover and song count) in the same order.
func albumsByIDs(ctx context.Context, conn *sql.DB, ids []string) ([]model.Album, error) {
	if len(ids) == 0 {
		return []model.Album{}, nil
	}

	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}

	rows, err := conn.QueryContext(ctx, `
		SELECT al.id, al.title, al.album_artist,
		       `+albumThumbnailSQL+`,
		       `+albumCountSQL+`
		FROM albums al
		WHERE al.id IN (`+placeholders(len(ids))+`)`, args...)
	if err != nil {
		return nil, err
	}
	list, err := scanAlbums(rows)
	if err != nil {
		return nil, err
	}

	byID := make(map[string]model.Album, len(list))
	for _, al := range list {
		byID[al.ID] = al
	}
	out := make([]model.Album, 0, len(ids))
	for _, id := range ids {
		if al, ok := byID[id]; ok {
			out = append(out, al)
		}
	}
	return out, nil
}

// rank sorts by score (best first) and returns the top IDs.
func rank(cands []candidate, limit int) []string {
	sort.SliceStable(cands, func(i, j int) bool { return cands[i].score > cands[j].score })
	if len(cands) > limit {
		cands = cands[:limit]
	}
	ids := make([]string, len(cands))
	for i, c := range cands {
		ids[i] = c.id
	}
	return ids
}

func placeholders(n int) string {
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}

// weight scales a score by a percentage, so secondary fields rank lower.
func weight(score, pct int) int {
	return score * pct / 100
}

func maxOf(vals ...int) int {
	m := 0
	for _, v := range vals {
		if v > m {
			m = v
		}
	}
	return m
}
