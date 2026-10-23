package db

// schemaStatements are run in order on every startup.
// Every statement uses IF NOT EXISTS, so running them again is safe.
// Parent tables come before the tables that reference them.
var schemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS artists (
	id   TEXT PRIMARY KEY,       -- SHA-1 of lowercase name
	name TEXT NOT NULL
	)`,

	`CREATE TABLE IF NOT EXISTS albums (
	id           TEXT PRIMARY KEY, -- SHA-1 of lowercase title + album artist
	title        TEXT NOT NULL,
	album_artist TEXT NOT NULL DEFAULT ''
	)`,

	`CREATE TABLE IF NOT EXISTS songs_meta (
	id             TEXT PRIMARY KEY,  -- SHA-1 of absolute path
	path           TEXT NOT NULL UNIQUE,
	title          TEXT NOT NULL DEFAULT '',
	album_id       TEXT REFERENCES albums(id),  -- NULL when there is no album tag
	total_duration INTEGER NOT NULL DEFAULT 0,  -- nanoseconds
	container      TEXT NOT NULL DEFAULT '',
	codec          TEXT NOT NULL DEFAULT '',
	thumbnail      TEXT NOT NULL DEFAULT ''     -- empty string means no thumbnail
	)`,

	`CREATE TABLE IF NOT EXISTS song_artists (
	song_id   TEXT NOT NULL REFERENCES songs_meta(id) ON DELETE CASCADE,
	artist_id TEXT NOT NULL REFERENCES artists(id),
	PRIMARY KEY (song_id, artist_id)
	)`,
	// favourites: one row per favourited song
	`CREATE TABLE IF NOT EXISTS favourites (
	song_id  TEXT PRIMARY KEY REFERENCES songs_meta(id) ON DELETE CASCADE,
	added_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))  -- unix seconds
	)`,

	// playlists: the playlist itself
	`CREATE TABLE IF NOT EXISTS playlists (
	id         TEXT PRIMARY KEY,  -- UUID generated in Go
	name       TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
	)`,

	// playlist_songs: ordered entries. A song can appear more than once.
	`CREATE TABLE IF NOT EXISTS playlist_songs (
	playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
	position    INTEGER NOT NULL,              -- 0-based order within the playlist
	song_id     TEXT NOT NULL REFERENCES songs_meta(id) ON DELETE CASCADE,
	added_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	PRIMARY KEY (playlist_id, position)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_playlist_songs_song ON playlist_songs(song_id)`,

	// downloads: remote songs queued or fetched from the server
	`CREATE TABLE IF NOT EXISTS downloads (
	remote_id  TEXT PRIMARY KEY,              -- ID on the remote server
	song_id    TEXT REFERENCES songs_meta(id) ON DELETE SET NULL,  -- NULL until the file is in the library
	status     TEXT NOT NULL DEFAULT 'queued'
	CHECK (status IN ('queued', 'downloading', 'done', 'failed')),
	local_path TEXT NOT NULL DEFAULT '',      -- where the file lives on disk
	error      TEXT NOT NULL DEFAULT '',      -- last error message when failed
	created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
	)`,
	`CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)`,
	`CREATE INDEX IF NOT EXISTS idx_songs_album ON songs_meta(album_id)`,
	`CREATE INDEX IF NOT EXISTS idx_song_artists_artist ON song_artists(artist_id)`,
}
