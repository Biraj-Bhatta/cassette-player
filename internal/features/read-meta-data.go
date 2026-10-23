// read-meta-data.go
package features

import (
	"github.com/biraj-bhatta/cassette-player/internal/model"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// probeOutput matches the parts of ffprobe's JSON we use.
type probeOutput struct {
	Format struct {
		FormatName string            `json:"format_name"`
		Duration   string            `json:"duration"`
		Tags       map[string]string `json:"tags"`
	} `json:"format"`
	Streams []struct {
		CodecType string `json:"codec_type"`
		CodecName string `json:"codec_name"`
	} `json:"streams"`
}

// ReadTrack returns the metadata for one audio file using ffprobe.
func ReadTrack(path string) (model.Track, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return model.Track{}, err
	}

	t := model.Track{
		ID:   model.SongID(abs),
		Path: abs,
	}

	out, err := newCommand("ffprobe",
		"-v", "error",
		"-print_format", "json",
		"-show_format", "-show_streams",
		abs,
	).Output()
	if err != nil {
		return t, err
	}

	var p probeOutput
	if err := json.Unmarshal(out, &p); err != nil {
		return t, err
	}

	secs, _ := strconv.ParseFloat(p.Format.Duration, 64)
	t.TotalDuration = time.Duration(secs * float64(time.Second))
	t.Container = p.Format.FormatName

	// Clean the text tags so stray spaces don't create duplicate names.
	// The artist string is not split here; SaveBatch splits it.
	t.Title = model.CleanName(tagValue(p.Format.Tags, "title"))
	t.Artist = model.CleanName(tagValue(p.Format.Tags, "artist"))
	t.Album = model.CleanName(tagValue(p.Format.Tags, "album"))

	// Album artist: used for the album card. Some files use "album_artist",
	// others "albumartist".
	t.AlbumArtist = model.CleanName(tagValue(p.Format.Tags, "album_artist"))
	if t.AlbumArtist == "" {
		t.AlbumArtist = model.CleanName(tagValue(p.Format.Tags, "albumartist"))
	}

	// First audio stream gives the codec.
	for _, s := range p.Streams {
		if s.CodecType == "audio" {
			t.Codec = s.CodecName
			break
		}
	}

	// No title tag: use the file name without extension.
	if t.Title == "" {
		t.Title = model.CleanName(strings.TrimSuffix(filepath.Base(abs), filepath.Ext(abs)))
	}

	t.Thumbnail = thumbnailDataURL(abs, t.ID)
	return t, nil
}

// thumbnailDataURL returns the cover art for a file as a data URL.
// Results are cached on disk, so each file is only processed once.
// It returns "" if the file has no embedded cover art.
func thumbnailDataURL(absPath, id string) string {
	cacheBase, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	dir := filepath.Join(cacheBase, "cassette-player", "thumbs")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return ""
	}

	out := filepath.Join(dir, id+".jpg")
	noArt := out + ".none"

	// Cached result from an earlier scan.
	if _, err := os.Stat(noArt); err == nil {
		return ""
	}

	data, err := os.ReadFile(out)
	if err != nil {
		// Not cached yet: extract the first video stream (the attached cover)
		// and resize it to 300px wide.
		cmd := newCommand("ffmpeg",
			"-v", "error", "-y",
			"-i", absPath,
			"-map", "0:v:0",
			"-frames:v", "1",
			"-vf", "scale=300:-2",
			out,
		)

		if err := cmd.Run(); err != nil {
			// No cover art: remember that so we don't retry next time.
			os.WriteFile(noArt, nil, 0o644)
			return ""
		}

		data, err = os.ReadFile(out)
		if err != nil {
			return ""
		}
	}

	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(data)
}

// tagValue finds a tag regardless of key case ("title" or "TITLE").
func tagValue(tags map[string]string, key string) string {
	for k, v := range tags {
		if strings.EqualFold(k, key) {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
