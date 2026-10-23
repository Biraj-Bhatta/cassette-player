package db

import (
	"context"
	"database/sql"
)


const (
	DownloadQueued      = "queued"
	DownloadDownloading = "downloading"
	DownloadDone        = "done"
	DownloadFailed      = "failed"
)

type Download struct {
	RemoteID  string
	SongID    string // empty until the file is in songs_meta
	Status    string
	LocalPath string
	Error     string
}

// QueueDownload records a remote song. Calling it twice for the same remote ID does nothing.
func QueueDownload(ctx context.Context, db *sql.DB, remoteID string) error {
	_, err := db.ExecContext(ctx, `
		INSERT OR IGNORE INTO downloads (remote_id, status, created_at, updated_at)
		VALUES (?, ?, ?, ?)`,
		remoteID, DownloadQueued, now(), now())
	return err
}

func SetDownloadStatus(ctx context.Context, db *sql.DB, remoteID, status, errMsg string) error {
	_, err := db.ExecContext(ctx,
		`UPDATE downloads SET status = ?, error = ?, updated_at = ? WHERE remote_id = ?`,
		status, errMsg, now(), remoteID)
	return err
}

// CompleteDownload is called after the file is renamed into place and
// inserted into songs_meta. Run it in the same transaction as that insert.
func CompleteDownload(ctx context.Context, db *sql.DB, remoteID, songID, localPath string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE downloads
		SET status = ?, song_id = ?, local_path = ?, error = '', updated_at = ?
		WHERE remote_id = ?`,
		DownloadDone, songID, localPath, now(), remoteID)
	return err
}

func ListDownloads(ctx context.Context, db *sql.DB) ([]Download, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT remote_id, COALESCE(song_id, ''), status, local_path, error
		FROM downloads ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Download
	for rows.Next() {
		var d Download
		if err := rows.Scan(&d.RemoteID, &d.SongID, &d.Status, &d.LocalPath, &d.Error); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}
