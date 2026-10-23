// internal/stream/handler.go
package stream

import (
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
)




// Registry maps song IDs to file paths. Songs are registered when they are
// played or listed, so the handler only serves files the app has seen.
type Registry struct {
	mu    sync.RWMutex
	paths map[string]string
	base  string // e.g. http://127.0.0.1:53124, set by Start
}
func NewRegistry() *Registry {
	return &Registry{paths: make(map[string]string)}
}

func (r *Registry) Put(id, path string) {
	r.mu.Lock()
	r.paths[id] = path
	r.mu.Unlock()
}

func (r *Registry) Get(id string) (string, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.paths[id]
	return p, ok
}

// Handler serves GET /audio/<id>. http.ServeContent handles Range requests,
// so the webview can seek without downloading the whole file.
func (r *Registry) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodGet && req.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}


		id := strings.TrimPrefix(req.URL.Path, "/audio/")
		id, _ = url.PathUnescape(id)

		path, ok := r.Get(id)
		if !ok {
			http.NotFound(w, req)
			return
		}

		f, err := os.Open(path)
		if err != nil {
			http.NotFound(w, req)
			return
		}
		defer f.Close()

		info, err := f.Stat()
		if err != nil || info.IsDir() {
			http.NotFound(w, req)
			return
		}

		w.Header().Set("Content-Type", contentType(path))
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeContent(w, req, filepath.Base(path), info.ModTime(), f)
	})
}

func contentType(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".mp3":
		return "audio/mpeg"
	case ".m4a", ".mp4", ".aac":
		return "audio/mp4"
	case ".flac":
		return "audio/flac"
	case ".ogg", ".oga":
		return "audio/ogg"
	case ".opus":
		return "audio/ogg"
	case ".wav":
		return "audio/wav"
	default:
		return "application/octet-stream"
	}
}

