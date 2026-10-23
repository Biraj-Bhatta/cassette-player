// main.go
package main

import (
	"embed"

	"github.com/biraj-bhatta/cassette-player/internal/stream"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Local audio server. It must start before the app is created.
	audio := stream.NewRegistry()
	if err := audio.Start(); err != nil {
		println("Error starting audio server:", err.Error())
		return
	}

	app := NewApp(audio)

	err := wails.Run(&options.App{
		Title:  "cassette-player",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
