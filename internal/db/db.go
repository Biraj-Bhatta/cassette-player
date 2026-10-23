// internal/db/open.go
package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite" // registers the "sqlite" driver
)

// Open connects to (or creates) the SQLite file at path and makes sure the tables exist.
// path should come from paths.DatabasePath(), so the file lives in the per-user data folder.
func Open(path string) (*sql.DB, error) {
	// _pragma values in the DSN run on every new connection in the pool.
	// Running PRAGMA with Exec once would only affect a single connection.
	//   foreign_keys(1):  enforces ON DELETE CASCADE and the REFERENCES clauses
	//   journal_mode(WAL): readers don't block the scan's writer
	//   busy_timeout(5000): wait up to 5 seconds for a lock instead of failing
	dsn := path +
		"?_pragma=foreign_keys(1)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(5000)"

	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	// Force the file to be created and the connection checked now,
	// so a bad path fails at startup rather than on the first query.
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("connecting to database %s: %w", path, err)
	}

	for _, stmt := range schemaStatements {
		if _, err := conn.Exec(stmt); err != nil {
			conn.Close()
			return nil, fmt.Errorf("creating schema: %w", err)
		}
	}
	return conn, nil
}
