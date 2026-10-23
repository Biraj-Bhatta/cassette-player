// scan.go
package main

import (
	"fmt"
	"log"
	"time"

	"github.com/biraj-bhatta/cassette-player/internal/db"
	"github.com/biraj-bhatta/cassette-player/internal/features"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// progressInterval limits how often progress events reach the frontend.
const progressInterval = 250 * time.Millisecond

// isBackgroundScan reports whether the library already has songs. In that case
// the scan runs quietly and the screens keep showing their current data.
func (a *App) isBackgroundScan() bool {
	n, err := db.CountSongs(a.ctx, a.conn)
	return err == nil && n > 0
}

// progressEmitter returns a callback that sends at most one progress event per interval.
// The scan calls it from one goroutine only, so it needs no lock.
func (a *App) progressEmitter() func(int) {
	var last time.Time
	return func(saved int) {
		if time.Since(last) < progressInterval {
			return
		}
		last = time.Now()
		runtime.EventsEmit(a.ctx, "scan:progress", saved)
	}
}

// ScanFolder starts a background scan of one folder. It returns an error right away if it can't start.
func (a *App) ScanFolder(dir string) error {
	log.Printf("ScanFolder: called with %q", dir)

	if a.conn == nil {
		return fmt.Errorf("database is not open")
	}
	if !a.scanning.CompareAndSwap(false, true) {
		return fmt.Errorf("a scan is already running")
	}

	background := a.isBackgroundScan()
	emit := a.progressEmitter()

	go func() {
		defer a.scanning.Store(false)
		defer func() {
			if r := recover(); r != nil {
				log.Println("ScanFolder: PANIC:", r)
				runtime.EventsEmit(a.ctx, "scan:error", fmt.Sprint("scan crashed: ", r))
			}
		}()

		runtime.EventsEmit(a.ctx, "scan:started", map[string]any{
			"dir":        dir,
			"background": background,
		})

		n, err := features.ScanAndSave(a.ctx, a.conn, dir, emit)
		if err != nil {
			log.Println("ScanFolder: error:", err)
			runtime.EventsEmit(a.ctx, "scan:error", err.Error())
			return
		}
		log.Println("ScanFolder: done, saved", n)
		runtime.EventsEmit(a.ctx, "scan:done", n)
	}()

	return nil
}

// ScanAllFolders scans every music folder in the settings, one after another.
func (a *App) ScanAllFolders() error {
	if a.conn == nil {
		return fmt.Errorf("database is not open")
	}

	s, err := a.GetSettings()
	if err != nil {
		return err
	}
	if len(s.MusicFolders) == 0 {
		return fmt.Errorf("no music folders set")
	}
	if !a.scanning.CompareAndSwap(false, true) {
		return fmt.Errorf("a scan is already running")
	}

	background := a.isBackgroundScan()
	folders := s.MusicFolders
	emit := a.progressEmitter()

	go func() {
		defer a.scanning.Store(false)
		runtime.EventsEmit(a.ctx, "scan:started", map[string]any{
			"dir":        "all folders",
			"background": background,
		})

		total := 0
		for _, dir := range folders {
			base := total
			n, err := features.ScanAndSave(a.ctx, a.conn, dir, func(saved int) {
				emit(base + saved)
			})
			if err != nil {
				log.Println("ScanAllFolders: error in", dir, ":", err)
				runtime.EventsEmit(a.ctx, "scan:error", err.Error())
				return
			}
			total += n
		}
		runtime.EventsEmit(a.ctx, "scan:done", total)
	}()

	return nil
}
