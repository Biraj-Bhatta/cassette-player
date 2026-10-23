// db/count.go
package db

import (
	"context"
	"database/sql"
)

// CountSongs returns how many songs are in the library.
func CountSongs(ctx context.Context, conn *sql.DB) (int, error) {
	var n int
	err := conn.QueryRowContext(ctx, `SELECT COUNT(*) FROM songs_meta`).Scan(&n)
	return n, err
}
