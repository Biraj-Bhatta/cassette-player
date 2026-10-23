# Note:
# This file only works for arch system
# Makefile for Cassette Player
APP      := cassette-player
TAGS     := webkit2_41
BIN      := build/bin/$(APP)
PREFIX   ?= $(HOME)/.local

.PHONY: help deps dev build install uninstall test clean

help:
	@echo "Targets:"
	@echo "  make deps       Install frontend packages and Go modules"
	@echo "  make dev        Run in development mode"
	@echo "  make build      Build a release binary"
	@echo "  make install    Install the binary, icon, and launcher for this user"
	@echo "  make uninstall  Remove the installed files"
	@echo "  make test       Run backend tests"
	@echo "  make clean      Remove build output"

deps:
	go mod tidy
	cd frontend && npm install

dev:
	wails dev -tags $(TAGS)

build:
	wails build -clean -platform linux/amd64 -tags $(TAGS)

install: build
	install -Dm755 $(BIN) $(PREFIX)/bin/$(APP)
	install -Dm644 build/appicon.png $(PREFIX)/share/icons/hicolor/1024x1024/apps/$(APP).png
	install -d $(PREFIX)/share/applications
	printf '%s\n' \
	  '[Desktop Entry]' \
	  'Type=Application' \
	  'Name=Cassette Player' \
	  'Comment=Local music player' \
	  'Exec=$(PREFIX)/bin/$(APP)' \
	  'Icon=$(PREFIX)/share/icons/hicolor/1024x1024/apps/$(APP).png' \
	  'Terminal=false' \
	  'Categories=Audio;Music;Player;' \
	  'StartupWMClass=$(APP)' \
	  > $(PREFIX)/share/applications/$(APP).desktop
	-update-desktop-database $(PREFIX)/share/applications 2>/dev/null

uninstall:
	rm -f $(PREFIX)/bin/$(APP)
	rm -f $(PREFIX)/share/icons/hicolor/1024x1024/apps/$(APP).png
	rm -f $(PREFIX)/share/applications/$(APP).desktop
	-update-desktop-database $(PREFIX)/share/applications 2>/dev/null

test:
	go test ./internal/... -v

# Removes build output and the frontend build. Keeps your source code,
# node_modules, and your library data in ~/.config/cassette-player.
clean:
	rm -rf build/bin
	rm -rf frontend/dist
