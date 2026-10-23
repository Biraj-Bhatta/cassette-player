// internal/settings/settings.go
package settings

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// Player holds playback tuning.
type Player struct {
	SeekSeconds int     `json:"seekSeconds"`
	VolumeStep  float64 `json:"volumeStep"`
}

// Keys holds KeyboardEvent.code values for each action.
type Keys struct {
	TogglePlay    string `json:"togglePlay"`
	SeekBackward  string `json:"seekBackward"`
	SeekForward   string `json:"seekForward"`
	NextRow       string `json:"nextRow"`
	PreviousRow   string `json:"previousRow"`
	PlayRow       string `json:"playRow"`
	ToggleSidebar string `json:"toggleSidebar"`
	MenuNext      string `json:"menuNext"`
	MenuPrevious  string `json:"menuPrevious"`
	CloseMenu     string `json:"closeMenu"`
}

// Settings is saved as JSON. Field names become the TypeScript field names.
type Settings struct {
	MusicFolders  []string `json:"musicFolders"`
	DefaultVolume int      `json:"defaultVolume"` // 0 to 100, applied at startup
	Player        Player   `json:"player"`
	Keys          Keys     `json:"keys"`
}

// DefaultKeys must match DEFAULT_KEYS in app-config.ts.
func DefaultKeys() Keys {
	return Keys{
		TogglePlay:    "Space",
		SeekBackward:  "ArrowLeft",
		SeekForward:   "ArrowRight",
		NextRow:       "ArrowDown",
		PreviousRow:   "ArrowUp",
		PlayRow:       "Enter",
		ToggleSidebar: "Tab",
		MenuNext:      "ArrowDown",
		MenuPrevious:  "ArrowUp",
		CloseMenu:     "Escape",
	}
}

// Default returns the settings used before the user changes anything.
func Default() Settings {
	return Settings{
		MusicFolders:  []string{},
		DefaultVolume: 100,
		Player:        Player{SeekSeconds: 15, VolumeStep: 0.05},
		Keys:          DefaultKeys(),
	}
}

// Load reads settings from path. A missing file returns the defaults.
// Fields missing from an older file keep their default values.
func Load(path string) (Settings, error) {
	s := Default()

	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return s, err
	}

	if err := json.Unmarshal(data, &s); err != nil {
		return Default(), err
	}
	s.normalize()
	return s, nil
}

// Save writes settings to path through a temporary file, so a crash can't
// leave a half-written file.
func Save(path string, s Settings) error {
	s.normalize()

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// normalize clamps numbers to safe ranges and fills empty keys with defaults.
func (s *Settings) normalize() {
	if s.DefaultVolume < 0 {
		s.DefaultVolume = 0
	}
	if s.DefaultVolume > 100 {
		s.DefaultVolume = 100
	}

	if s.Player.SeekSeconds < 1 || s.Player.SeekSeconds > 120 {
		s.Player.SeekSeconds = 15
	}
	if s.Player.VolumeStep < 0.01 || s.Player.VolumeStep > 0.5 {
		s.Player.VolumeStep = 0.05
	}

	d := DefaultKeys()
	fill := func(v *string, def string) {
		if strings.TrimSpace(*v) == "" {
			*v = def
		}
	}
	fill(&s.Keys.TogglePlay, d.TogglePlay)
	fill(&s.Keys.SeekBackward, d.SeekBackward)
	fill(&s.Keys.SeekForward, d.SeekForward)
	fill(&s.Keys.NextRow, d.NextRow)
	fill(&s.Keys.PreviousRow, d.PreviousRow)
	fill(&s.Keys.PlayRow, d.PlayRow)
	fill(&s.Keys.ToggleSidebar, d.ToggleSidebar)
	fill(&s.Keys.MenuNext, d.MenuNext)
	fill(&s.Keys.MenuPrevious, d.MenuPrevious)
	fill(&s.Keys.CloseMenu, d.CloseMenu)

	seen := make(map[string]bool)
	folders := []string{}
	for _, f := range s.MusicFolders {
		f = strings.TrimSpace(f)
		if f == "" {
			continue
		}
		f = filepath.Clean(f)
		if seen[f] {
			continue
		}
		seen[f] = true
		folders = append(folders, f)
	}
	s.MusicFolders = folders
}
