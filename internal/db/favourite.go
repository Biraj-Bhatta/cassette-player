package db

import (
	"context"
	"database/sql"
	"time"

)

func now() int64 { return time.Now().Unix() }

func AddFavourite(ctx context.Context, db *sql.DB, songID string) error {
	_, err := db.ExecContext(ctx,
		`INSERT OR IGNORE INTO favourites (song_id, added_at) VALUES (?, ?)`,
		songID, now())
	return err
}

func RemoveFavourite(ctx context.Context, db *sql.DB, songID string) error {
	_, err := db.ExecContext(ctx, `DELETE FROM favourites WHERE song_id = ?`, songID)
	return err
}

// ListFavourites returns favourited song IDs, newest first.
func ListFavourites(ctx context.Context, db *sql.DB) ([]string, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT song_id FROM favourites ORDER BY added_at DESC`)
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
