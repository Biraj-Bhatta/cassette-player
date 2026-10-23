//batch.go

package db

import (
	"context"
	"database/sql"
	"strings"

	"github.com/biraj-bhatta/cassette-player/internal/model"
)

// SaveBatch writes tracks along with their artists, albums, and artist links.
// Everything runs in one transaction, so a batch either fully saves or fully rolls back.
func SaveBatch(ctx context.Context, conn *sql.DB, tracks []model.Track) error {
	artists := make(map[string]model.Artist)
	albums := make(map[string]model.Album)
	var links []model.SongArtist

	for _, t := range tracks {
		songID := model.SongID(t.Path)
		names := model.SplitArtists(t.Artist)

		for _, name := range names {
			a := model.Artist{ID: model.ArtistID(name), Name: name}
			artists[a.ID] = a
			links = append(links, model.SongArtist{SongID: songID, ArtistID: a.ID})
		}

		if t.Album != "" {
			// Album is identified by its title only. The artist shown on the card
			// is the album artist tag, or the first track artist when that tag is empty.
			displayArtist := strings.TrimSpace(t.AlbumArtist)
			if displayArtist == "" && len(names) > 0 {
				displayArtist = names[0]
			}

			id := model.AlbumID(t.Album)
			if _, exists := albums[id]; !exists {
				albums[id] = model.Album{
					ID:          id,
					Title:       t.Album,
					AlbumArtist: displayArtist,
				}
			}
		}
	}

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // does nothing after a successful commit

	// Parents first, then the rows that reference them.
	if err := insertArtists(ctx, tx, artists); err != nil {
		return err
	}
	if err := insertAlbums(ctx, tx, albums); err != nil {
		return err
	}
	if err := insertSongs(ctx, tx, tracks); err != nil {
		return err
	}
	if err := insertSongArtists(ctx, tx, links); err != nil {
		return err
	}
	return tx.Commit()
}
