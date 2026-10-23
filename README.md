# Cassette Player

A desktop music player built with Go, Wails v2, React, TypeScript, Tailwind CSS, and SQLite. It scans music folders on your computer, reads tags with ffprobe, extracts cover art with ffmpeg, and keeps a searchable library of songs, artists, albums, favourites, and playlists. Your music stays on your device.

## Features

- Scan music folders, including subfolders (hidden files and folders are skipped)
- Browse songs, artists, albums, favourites, and playlists
- Fuzzy search across songs, artists, and albums
- Playlists, favourites, shuffle, repeat, and volume
- Customisable keyboard shortcuts and settings

## Dependencies

| Dependency | Needed for |
|---|---|
| Go 1.22+ | Backend |
| Node.js 18+ with npm | Frontend |
| Wails CLI v2.16.0 | Development and builds |
| ffmpeg (includes ffprobe) | Reading tags and cover art. Required at runtime. |
| WebKitGTK 4.1 (Linux) | Window rendering |
| GStreamer plugins (Linux) | Audio playback |

---

## Windows: install and try the app

Double-click `winbuild\install.bat`. The script installs any missing tools (Go, Node.js, ffmpeg, WebView2, Wails), builds the app, and adds it to the Start Menu.

To uninstall:

```bat
winbuild\install.bat -Uninstall
```

Your library and settings are kept in `%AppData%\cassette-player` unless you delete that folder.

---

## Linux: install

Install the system dependencies for your distribution.

**Ubuntu / Debian**

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev ffmpeg \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav
```

**Arch Linux**

```bash
sudo pacman -S --needed base-devel pkgconf gtk3 webkit2gtk-4.1 ffmpeg \
  gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly gst-libav
```

Install the Wails CLI, then check the setup:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
wails doctor
```

Make sure `$(go env GOPATH)/bin` is on your `PATH`.

Then install the app for your user:

```bash
git clone https://github.com/biraj-bhatta/cassette-player.git
cd cassette-player
make deps
make install
```

Run it with `cassette-player` or from your application menu. To uninstall:

```bash
make uninstall
```

---

## Linux: run in development

```bash
make deps   # first time only
make dev
```

---

## For developers

**Build a release binary**

```bash
make build
```

The binary is written to `build/bin/`.

**Run the backend tests**

```bash
make test
```

**Remove build output**

```bash
make clean
```

**Project layout**
app.go, scan.go, main.go     Wails entry points and methods the frontend calls
internal/db                  SQLite schema, queries, and search
internal/features            Tag reading (ffprobe) and batched scanning
internal/settings            settings.json handling
internal/paths               Per-user data folder
internal/stream              Local server for audio streaming
frontend/src                 React interface
winbuild/                    Windows install script
Makefile                     Linux build and install targets


**Data location**

| OS | Library and settings |
|---|---|
| Linux | `~/.config/cassette-player/` |
| Windows | `%AppData%\cassette-player\` |
| macOS | `~/Library/Application Support/cassette-player/` |

Cover images are cached in the user cache folder and can be cleared from Settings.

---

## Troubleshooting

- **No songs after a scan:** check that ffmpeg is installed by running `ffprobe -version`.
- **Songs don't play on Linux:** install the GStreamer plugins listed above, then start the app from a terminal to see which codec is missing.
- **WebKit errors when building on Linux:** the Makefile uses `-tags webkit2_41`. Systems with only WebKitGTK 4.0 need `-tags webkit2_40` instead.

---

## License

Cassette Player is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html) for more details.

See the [LICENSE](LICENSE) file for the full text.
