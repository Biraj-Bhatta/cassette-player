// internal/stream/server.go
package stream

import (
	"fmt"
	"log"
	"net"
	"net/http"
)

// Start serves audio on a free port on 127.0.0.1. It runs in the background
// until the app exits.
func (r *Registry) Start() error {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}
	r.base = fmt.Sprintf("http://%s", ln.Addr().String())

	go func() {
		if err := http.Serve(ln, r.Handler()); err != nil {
			log.Println("audio server stopped:", err)
		}
	}()

	log.Println("audio server:", r.base)
	return nil
}

// BaseURL returns the address Start chose, such as http://127.0.0.1:53124.
func (r *Registry) BaseURL() string {
	return r.base
}
