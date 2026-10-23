package db

import (
	"context"
	"database/sql"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// insertArtists writes artists inside an existing transaction.
// INSERT OR IGNORE skips artists that an earlier batch already saved.
func insertArtists(ctx context.Context, tx *sql.Tx, artists map[string]model.Artist) error {
	stmt, err := tx.PrepareContext(ctx,
		`INSERT OR IGNORE INTO artists (id, name) VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, a := range artists {
		if _, err := stmt.ExecContext(ctx, a.ID, a.Name); err != nil {
			return err
		}
	}
	return nil
}

// ListArtists returns every artist, sorted by name.
func ListArtists(ctx context.Context, conn *sql.DB) ([]model.Artist, error) {
	rows, err := conn.QueryContext(ctx,
		`SELECT id, name FROM artists ORDER BY name COLLATE NOCASE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.Artist
	for rows.Next() {
		var a model.Artist
		if err := rows.Scan(&a.ID, &a.Name); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
