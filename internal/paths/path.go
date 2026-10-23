// internal/paths/paths.go
package paths

import (
	"fmt"
	"os"
	"path/filepath"
)

const appDirName = "cassette-player"

// DataDir returns the per-user folder for the app's data, and creates it if needed.
//   Windows: %AppData%\cassette-player
//   Linux:   ~/.config/cassette-player
//   macOS:   ~/Library/Application Support/cassette-player
func DataDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("find user config dir: %w", err)
	}
	dir := filepath.Join(base, appDirName)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create data dir: %w", err)
	}
	return dir, nil
}

// DatabasePath returns the full path of the SQLite file.
func DatabasePath() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "library.db"), nil
}




// SettingsPath returns the path of settings.json inside the data folder.
func SettingsPath() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "settings.json"), nil
}
