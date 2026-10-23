// features/save-data-sqlite.go
package features

import (
	"github.com/biraj-bhatta/cassette-player/internal/db"
	"github.com/biraj-bhatta/cassette-player/internal/model"
	"context"
	"database/sql"
	"io/fs"
	"log"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

const batchSize = 100

// audioExts lists the file types the scanner accepts. Anything else is ignored.
var audioExts = map[string]bool{
	".mp3":  true,
	".m4a":  true,
	".aac":  true,
	".flac": true,
	".ogg":  true,
	".oga":  true,
	".opus": true,
	".wav":  true,
	".aiff": true,
	".aif":  true,
	".wma":  true,
	".ape":  true,
	".wv":   true,
}

// isHidden reports whether a file or folder name starts with a dot.
// On Linux and macOS this is the hidden convention (.venv, .git, .cache).
func isHidden(name string) bool {
	return strings.HasPrefix(name, ".")
}

// isAudio reports whether the file has one of the accepted audio extensions.
func isAudio(path string) bool {
	return audioExts[strings.ToLower(filepath.Ext(path))]
}

// ScanAndSave walks rootDir, reads metadata in parallel, and saves everything to the database.
// Hidden files and folders are skipped, and only audio files are read.
// It returns how many tracks were saved.
func ScanAndSave(parent context.Context, conn *sql.DB, rootDir string,
	onProgress func(saved int)) (int, error) {

	// Absolute paths keep song IDs (a hash of the path) stable across scans.
	absRoot, err := filepath.Abs(rootDir)
	if err != nil {
		return 0, err
	}

	ctx, cancel := context.WithCancel(parent)
	defer cancel()

	paths := make(chan string)
	tracks := make(chan model.Track)
	walkErr := make(chan error, 1)

	// 1. Walker: sends audio file paths only
	go func() {
		defer close(paths)
		walkErr <- filepath.WalkDir(absRoot, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				log.Println("skipping:", err)
				return nil
			}

			// Skip hidden folders entirely, so their contents are never visited.
			// The root itself is never skipped, even if its name starts with a dot.
			if d.IsDir() {
				if path != absRoot && isHidden(d.Name()) {
					return filepath.SkipDir
				}
				return nil
			}

			// Skip hidden files and non-audio files such as images.
			if isHidden(d.Name()) || !isAudio(path) {
				return nil
			}

			select {
			case paths <- path:
				return nil
			case <-ctx.Done():
				return ctx.Err()
			}
		})
	}()

	// 2. Workers: read metadata in parallel
	var wg sync.WaitGroup
	for i := 0; i < runtime.NumCPU(); i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for p := range paths {
				t, err := ReadTrack(p)
				if err != nil {
					log.Println("skip", p, "->", err)
					continue
				}
				select {
				case tracks <- t:
				case <-ctx.Done():
					return
				}
			}
		}()
	}
	go func() {
		wg.Wait()
		close(tracks) // no more tracks are coming
	}()

	// 3. Writer: saves in batches (runs on the calling goroutine)
	saved, err := writeBatches(ctx, conn, tracks, onProgress)
	if err != nil {
		cancel() // stop the walker and workers
		return saved, err
	}

	if err := <-walkErr; err != nil {
		return saved, err
	}
	return saved, nil
}

func writeBatches(ctx context.Context, conn *sql.DB, in <-chan model.Track,
	onProgress func(saved int)) (int, error) {

	saved := 0
	batch := make([]model.Track, 0, batchSize)

	flush := func() error {
		if err := db.SaveBatch(ctx, conn, batch); err != nil {
			return err
		}
		saved += len(batch)
		batch = batch[:0]
		if onProgress != nil {
			onProgress(saved) // report after each committed batch
		}
		return nil
	}

	for t := range in {
		batch = append(batch, t)
		if len(batch) == batchSize {
			if err := flush(); err != nil {
				return saved, err
			}
		}
	}
	if len(batch) > 0 {
		if err := flush(); err != nil {
			return saved, err
		}
	}
	return saved, nil
}
