package features

import (
	"github.com/biraj-bhatta/cassette-player/internal/model"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
)



func GetMetaData(rootDir string) ([]model.Track, error) {
    var tracks []model.Track

    err := filepath.WalkDir(rootDir, func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            fmt.Println("Skipping:", err)
            return nil
        }
        if d.IsDir() {
            return nil
        }

        // Optional: Filter by file extension if you only want audio files
        // ext := strings.ToLower(filepath.Ext(path))
        // if ext != ".mp3" && ext != ".flac" && ext != ".wav" {
        //     return nil
        // }

        t, err := ReadTrack(path)
        if err != nil {
            log.Println("skip", path, "->", err)
            return nil // Keep walking; one bad file won't stop the scan
        }

        tracks = append(tracks, t)

        return nil
    })

    if err != nil {
        return nil, err
    }

    return tracks, nil
}
