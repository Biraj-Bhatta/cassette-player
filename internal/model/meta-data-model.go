// Package model contains the structs used across the application.
package model

import (
	"time"
)

type Track struct {
	ID            string        `json:"id"`
	Path          string        `json:"path"`
	Title         string        `json:"title"`
	Artist        string        `json:"artist"`
	Album         string        `json:"album"`
	AlbumArtist   string        `json:"albumArtist"`
	TotalDuration time.Duration `json:"duration"` // nanoseconds
	Container     string        `json:"container"`
	Codec         string        `json:"codec"`
	Thumbnail     string        `json:"thumbnail"`
}


// Song is a track as shown in an album's track list.
type Song struct {
	ID       string `json:"id"`
	Path     string `json:"path"`
	Title    string `json:"title"`
	Duration int64  `json:"duration"` // nanoseconds
}

type Artist struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// internal/model
type Album struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	AlbumArtist string `json:"albumArtist"`
	Thumbnail   string `json:"thumbnail"`
	SongCount   int    `json:"songCount"`
}

// SongArtist links one song to one artist.
type SongArtist struct {
	SongID   string
	ArtistID string
}
