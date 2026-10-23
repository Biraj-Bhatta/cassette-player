# Cassette Player

A desktop music player built with **Go**, **Wails v2**, **React**, **TypeScript**, **Tailwind CSS**, and **SQLite**. It scans folders on your computer, reads audio tags with **ffprobe**, extracts cover art with **ffmpeg**, and keeps a searchable library with songs, artists, albums, favourites, and playlists.

---

## Features

- **Library scan:** Walks a folder recursively, reads tags in parallel, and saves everything in one transaction per batch. Rescanning refreshes existing songs.
- **Songs screen:** Paged list sorted by artist, album, and title. Loads more as you scroll.
- **Artists screen:** Grid of artists with search. Opening an artist shows their songs and albums.
- **Albums screen:** Paged album grid with "All albums" and "By artist" tabs. Opening an album shows its songs. Scroll position is restored when you go back.
- **Favourites:** Toggle from any track's ⋮ menu. Favourites are stored in the database.
- **Playlists:** Create, rename, delete, play, shuffle, and remove songs (with confirmation). Duplicate songs are blocked in the backend and reported with a toast.
- **Search:** Dropdown with songs, artists, and albums. The filter chips (All, Songs, Artists, Albums) choose which groups are searched.
- **Player:** Play, pause, seek, next, previous, shuffle, repeat, and volume. Keyboard shortcuts are included.
- **Track menu:** Add to playlist, favourite, go to artist, go to album, and go to favourites.
- **Caching:** Lists are cached in the frontend, so switching views doesn't refetch. The cache clears after each scan.

---

## Requirements

| Tool | Version | Used for |
|---|---|---|
| Go | 1.22 or newer | Backend |
| Node.js | 18 or newer, with npm | Frontend build |
| Wails CLI | v2.16.0 | Builds, dev server, bindings |
| ffmpeg and ffprobe | Any recent version | Reading tags and extracting cover art |
| WebKit and GTK (Linux only) | See below | Wails webview |

`ffprobe` is installed with `ffmpeg`. The app calls both as external programs, so they must be on your `PATH`.

---

## 1. Install dependencies

### Linux (Ubuntu / Debian)

```bash
# Build tools and the GTK/WebKit libraries Wails needs.
# On Ubuntu 24.04 or newer, use libwebkit2gtk-4.1-dev instead of 4.0.
sudo apt update
sudo apt install -y build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev

# ffmpeg (includes ffprobe)
sudo apt install -y ffmpeg
```

### macOS

```bash
xcode-select --install
brew install go node ffmpeg
```

### Windows

```powershell
winget install GoLang.Go
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
```

Open a new terminal after installing so the new `PATH` entries load. Windows also needs WebView2, which is included in Windows 11 and most current Windows 10 installs.

### Install the Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
```

Make sure `$(go env GOPATH)/bin` is on your `PATH`.

### Check your setup

```bash
go version
node -v
npm -v
ffmpeg -version
ffprobe -version
wails doctor
```

`wails doctor` reports any missing system packages. Fix every item it marks as missing before continuing.

---

## 2. Get the project and install packages

```bash
git clone <your-repo-url> cassette-player
cd cassette-player

# Go modules (includes github.com/sahilm/fuzzy)
go mod tidy

# Frontend packages
cd frontend
npm install
cd ..
```

If you add the fuzzy search package to an existing project, run this once:

```bash
go get github.com/sahilm/fuzzy
```

---

## 3. Run in development mode

```bash
wails dev
```

This starts the Go backend and the Vite dev server with hot reload. Frontend changes appear immediately. Go changes rebuild automatically.

When you change an exported Go method, Wails regenerates the bindings in `frontend/wailsjs/`. If the frontend still shows the old function signatures, stop `wails dev` and start it again, or run:

```bash
wails generate module
```

---

## 4. Build a release

```bash
wails build
```

The executable is written to `build/bin/`. Useful options:

```bash
wails build -clean          # clear the build folder first
wails build -platform linux/amd64
wails build -platform windows/amd64
wails build -platform darwin/universal
```

The built app still needs `ffmpeg` and `ffprobe` on the target machine, because it calls them at runtime.

---

## 5. First run

1. Start the app with `wails dev` or open the built executable.
2. Click **Scan** in the header and choose a music folder. Subfolders are included.
3. Wait for the scan to finish. The Songs, Artists, and Albums screens fill in as batches are saved.
4. Use the search box to find songs, artists, or albums.

The first scan is slower because `ffprobe` runs for each file and `ffmpeg` extracts cover art. Covers are cached in your user cache folder, under `cassette-player/thumbs`, so later scans of the same files are faster.

---

## Project structure

```
cassette-player/
├── app.go                      Wails bindings (methods the frontend can call)
├── main.go                     Wails entry point
├── internal/
│   ├── model/                  Shared types (Track, Album, Artist) and ID helpers
│   │   ├── hash.go             HashID, SongID, ArtistID, AlbumID
│   │   └── normalize.go        CleanName, SplitArtists
│   ├── db/                     SQLite access
│   │   ├── schema.go           Table definitions (run on startup)
│   │   ├── migrate.go          Column additions for existing databases
│   │   ├── songs.go            SaveBatch and song inserts
│   │   ├── albums.go           Album queries (paged)
│   │   ├── tracks.go           All-songs query (paged)
│   │   ├── favourites.go       Favourite songs
│   │   ├── playlists.go        Playlist CRUD
│   │   ├── playlist-tracks.go  Songs in a playlist
│   │   ├── playlist-songs.go   Add (no duplicates) and remove
│   │   ├── search.go           Search for the dropdown
│   │   └── fuzzy.go            Fuzzy matching (sahilm/fuzzy)
│   └── features/
│       ├── read-meta-data.go   ffprobe tag reading, ffmpeg cover extraction
│       └── save-data-sqlite.go Scan: walk, read in parallel, save in batches
└── frontend/
    ├── src/
    │   ├── App.tsx             Layout, navigation, player wiring
    │   ├── hooks/              usePlayer, useTrackActions, usePlaylists, shortcuts
    │   ├── lib/
    │   │   ├── library-cache.ts  Frontend cache and paging hook
    │   │   └── toast.tsx         Toast notifications
    │   ├── types/model.ts      Frontend types
    │   └── components/custom-ui/
    │       ├── albumbs/        Albums screen, album card, album detail, covers
    │       ├── allSongs/       Songs list
    │       ├── artists/        Artists list and artist detail
    │       ├── favourites/     Favourites screen
    │       ├── playlists/      Playlists screen, detail, card
    │       ├── common/         ListUi, TrackMenu, dialogs, player bar, avatar
    │       └── landingPage/    Sidebar, search box, search filter, search panel
    └── wailsjs/                Generated bindings (do not edit by hand)
```

---

## Database

SQLite is created and migrated on startup. The main tables are:

| Table | Purpose |
|---|---|
| `songs_meta` | One row per file. ID is a hash of the absolute path. |
| `artists` | One row per artist name (case-insensitive). |
| `albums` | One row per album title. |
| `song_artists` | Links songs to artists (many-to-many). |
| `favourites` | Favourited song IDs and when they were added. |
| `playlists` | Playlist names and timestamps. |
| `playlist_songs` | Ordered playlist entries, with `position` starting at 0. |
| `downloads` | Reserved for remote downloads (not used yet). |

To find the database file, check where `db` is opened in `app.go` or `main.go`.

### Resetting the library data

Clear the derived tables, then rescan. Favourites and playlists are kept, because song IDs come from file paths:

```sql
DELETE FROM song_artists;
DELETE FROM artists;
DELETE FROM albums;
UPDATE songs_meta SET album_id = NULL;
```

To remove everything, delete the database file while the app is closed.

---

## How the main parts work

**Tag reading.** `ReadTrack` runs `ffprobe` on each file and reads the title, artist, album, and album artist tags. It falls back to the file name when the title is missing. Tag values are cleaned with `CleanName`, which trims spaces and removes zero-width characters.

**Artists.** The artist tag is split on `,`, `;`, `/`, `&`, `+`, `|`, `feat.`, `ft.`, and `featuring`. Each name is stored once, case-insensitively.

**Albums.** An album's ID is a hash of its title only. The card shows the album artist tag, or the first track artist when that tag is empty. This means two albums with the same title by different artists merge into one album. Use the album artist for the key later if this becomes a problem.

**Covers.** Each album card uses the first song in the album that has cover art. Songs without art are skipped, and albums without any cover show a placeholder.

**Paging.** Songs, albums, and album lists load 60 to 100 items at a time. The frontend loads the next page when the bottom of the list comes into view.

**Playlists.** Adding a song that is already in the playlist returns an error, and the UI shows a toast. Removing a song uses its position, so positions are renumbered after each removal.

**Search.** Each word in the query is matched with `sahilm/fuzzy`, in any order, against song titles, artist names, and album titles. Results are grouped and limited to 8 per group.

---

## Known limitations

- Playlist songs can't be reordered yet.
- Albums are keyed by title only, so same-named albums by different artists are merged.
- Fuzzy search requires the letters of each word to appear in order. Typos like "ekdav" for "ekdev" don't match.
- The album song list and playlists are not sorted by track number, because `track_no` and `disc_no` aren't stored yet.
- Audio is sent to the frontend as base64, which is slow for very large files.

---

## Troubleshooting

**`ffprobe: executable file not found in $PATH`**
Install ffmpeg (see step 1) and open a new terminal. Run `ffprobe -version` to confirm.

**`Build error - undefined: model.SongID` or similar**
Some model helpers are in a different file than expected. Check that `internal/model` defines `HashID`, `SongID`, `ArtistID`, `AlbumID`, `CleanName`, and `SplitArtists` exactly once.

**Frontend shows old function signatures or type errors after a Go change**
Regenerate bindings with `wails generate module`, or restart `wails dev`.

**`Failed to load audio` in the console**
The file path or the binding is wrong. Check that the file still exists at the stored path.

**`play failed` in the console**
The codec isn't supported by the webview. Try another format, such as MP3 or AAC in M4A.

**`Overriding existing handler for signal 10` on Linux**
This message comes from WebKit and is harmless.

**`wails doctor` reports missing GTK or WebKit packages on Linux**
Install the packages listed in step 1, then run `wails doctor` again.

**Scan finds no songs**
Check that the folder contains supported audio files and that `ffprobe` can read them:

```bash
ffprobe -v error -show_format "/path/to/song.mp3"
```

---

## Useful commands

```bash
wails dev                  # run with hot reload
wails build                # release build in build/bin/
wails generate module      # regenerate Go bindings for the frontend
go test ./internal/db/ -v  # run backend tests
cd frontend && npm run build   # type-check and build the frontend only
```

---

## Tech stack

- [Wails v2](https://wails.io/): desktop shell and Go-to-JavaScript bindings
- [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [SQLite](https://www.sqlite.org/) via Go's `database/sql`
- [ffmpeg](https://ffmpeg.org/) and ffprobe for tags and cover art
- [sahilm/fuzzy](https://github.com/sahilm/fuzzy) for search matching

---

## License

Add your license here.
```

Some details come from our conversation rather than your files, so check them before publishing:

- **Database path:** The README doesn't name the SQLite file location because I haven't seen your `app.go` or `main.go`.
- **SQLite driver:** It's whichever driver is in your `go.mod`, which I haven't seen.
- **Frontend path aliases:** The code uses `@/` and `@wails/`. Make sure both are set in `tsconfig.json` and `vite.config.ts`.
- **Project structure:** File names are taken from our chat, so update any that differ from your project.
