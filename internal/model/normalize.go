// internal/model/normalize.go
package model

import (
	"crypto/sha1"
	"encoding/hex"
	"regexp"
	"strings"
)

var spaceRun = regexp.MustCompile(`\s+`)

// CleanName trims the name and collapses repeated whitespace. Case is kept for display.
func CleanName(s string) string {
	return strings.TrimSpace(spaceRun.ReplaceAllString(s, " "))
}

// SongID is the ID for a song: a hash of its absolute path.
func SongID(path string) string { return hashID(path) }

// Key is the case-insensitive form used for IDs and comparisons.
func Key(s string) string {
	return strings.ToLower(CleanName(s))
}

func hashID(parts ...string) string {
	sum := sha1.Sum([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(sum[:])
}

// ArtistID is the SHA-1 of the lowercase artist name.
func ArtistID(name string) string {
	return hashID(Key(name))
}

// AlbumID is the SHA-1 of the lowercase title and lowercase album artist.
func AlbumID(title string) string {
	return hashID(Key(title))
}

// artistSep splits on , ; / & + | and on "feat", "ft", and "featuring".
// Spaces alone never split a name.
var artistSep = regexp.MustCompile(`(?i)\s*(?:[,;/&+|]|\bfeat\.?|\bft\.?|\bfeaturing\b)\s*`)

// SplitArtists turns an artist tag such as "A, B; C feat. D" into separate names.
// Duplicates are removed case-insensitively, and empty parts are dropped.
func SplitArtists(s string) []string {
	seen := make(map[string]bool)
	var out []string
	for _, part := range artistSep.Split(s, -1) {
		name := CleanName(part)
		k := Key(name)
		if name == "" || seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, name)
	}
	return out
}
