import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismiss, usePopoverPosition } from "@/hooks/usePopOver";
import type { PlaylistOption, TrackActions, TrackRef } from "@/types/model";

const PANEL_WIDTH = 224; // w-56
const SUBMENU_WIDTH = 240; // w-60, the widest submenu
const SURFACE = "rounded-md border bg-background py-1 shadow-lg";

type TrackMenuProps = {
    track: TrackRef;
    actions: TrackActions;
};

// The ⋮ button for one row. Owns open/closed state and draws the panel on document.body.
export default function TrackMenu({ track, actions }: TrackMenuProps) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);
    const { position, submenuSide } = usePopoverPosition(
        open,
        buttonRef,
        panelRef,
        PANEL_WIDTH,
        SUBMENU_WIDTH,
    );
    useDismiss(open, close, buttonRef, panelRef);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation(); // don't start the track
                    setOpen((o) => !o);
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-zinc-500 hover:bg-background hover:text-foreground"
            >
                ⋮
            </button>

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="menu"
                        // React events bubble through portals, so stop them here.
                        onClick={(e) => e.stopPropagation()}
                        style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
                        className={`fixed z-50 ${SURFACE}`}
                    >
                        <TrackMenuItems
                            track={track}
                            actions={actions}
                            submenuSide={submenuSide}
                            onDone={close}
                        />
                    </div>,
                    document.body,
                )}
        </>
    );
}

type TrackMenuItemsProps = {
    track: TrackRef;
    actions: TrackActions;
    submenuSide: "right" | "left";
    onDone: () => void; // closes the menu after an option is picked
};

// The options, in order. Each one calls a handler in `actions`, then closes the menu.
function TrackMenuItems({ track, actions, submenuSide, onDone }: TrackMenuItemsProps) {
    const [openSubmenu, setOpenSubmenu] = useState<"playlist" | "artist" | null>(null);

    const artists = splitArtists(track.artist);
    const submenuPosition = submenuSide === "right" ? "left-full ml-1" : "right-full mr-1";

    const goToArtist = () => {
        if (artists.length === 1) {
            actions.onGoToArtist(artists[0]);
            onDone();
        } else if (artists.length > 1) {
            setOpenSubmenu((s) => (s === "artist" ? null : "artist"));
        }
    };

    return (
        <>
            {/* 1. Add to playlist */}
            <div className="relative" onMouseEnter={() => setOpenSubmenu("playlist")}>
                <MenuItem
                    label="Add to playlist"
                    hasSubmenu
                    onClick={() => setOpenSubmenu((s) => (s === "playlist" ? null : "playlist"))}
                />
                {openSubmenu === "playlist" && (
                    <PlaylistSubmenu
                        className={submenuPosition}
                        playlists={actions.playlists}
                        onPick={(playlistId) => {
                            actions.onAddToPlaylist(playlistId, track);
                            onDone();
                        }}
                        onCreate={() => {
                            actions.onCreatePlaylist(track);
                            onDone();
                        }}
                    />
                )}
            </div>

            {/* 2. Add / remove favourites */}
            <MenuItem
                label={actions.isFavourite(track.id) ? "Remove from favourites" : "Add to favourites"}
                onClick={() => {
                    actions.onToggleFavourite(track);
                    onDone();
                }}
            />

            {/* 3. Go to artist: direct for one artist, submenu for several */}
            <div
                className="relative"
                onMouseEnter={() => {
                    if (artists.length > 1) setOpenSubmenu("artist");
                }}
            >
                <MenuItem
                    label="Go to artist"
                    hasSubmenu={artists.length > 1}
                    disabled={artists.length === 0}
                    onClick={goToArtist}
                />
                {openSubmenu === "artist" && artists.length > 1 && (
                    <ArtistSubmenu
                        className={submenuPosition}
                        names={artists}
                        onPick={(name) => {
                            actions.onGoToArtist(name);
                            onDone();
                        }}
                    />
                )}
            </div>

            {/* 4. Go to album */}
            <MenuItem
                label="Go to album"
                disabled={!track.album}
                onClick={() => {
                    actions.onGoToAlbum(track);
                    onDone();
                }}
            />

            {/* 5. Go to favourites view */}
            <MenuItem
                label="Go to favourites"
                onClick={() => {
                    actions.onGoToFavourites();
                    onDone();
                }}
            />

            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    actions.onDeleteFromLibrary(track);
                    onDone();
                }}
                className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-muted"
            >
                Delete from library
            </button>        </>
    );
}

type PlaylistSubmenuProps = {
    className: string;
    playlists: PlaylistOption[];
    onPick: (playlistId: string) => void;
    onCreate: () => void;
};

// Searchable playlist list. The search text lives here, so it resets when the submenu closes.
function PlaylistSubmenu({ className, playlists, onPick, onCreate }: PlaylistSubmenuProps) {
    const [filter, setFilter] = useState("");
    const shown = playlists.filter((p) =>
        p.name.toLowerCase().includes(filter.trim().toLowerCase()),
    );

    return (
        <div className={`absolute top-0 w-60 ${SURFACE} ${className}`}>
            <div className="px-2 pb-1">
                <input
                    autoFocus
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Find a playlist"
                    className="w-full rounded border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-foreground"
                />
            </div>

            <MenuItem label="New playlist" onClick={onCreate} />
            <div className="my-1 border-t" />

            <div className="max-h-72 overflow-y-auto">
                {shown.map((p) => (
                    <MenuItem key={p.id} label={p.name} onClick={() => onPick(p.id)} />
                ))}
                {shown.length === 0 && (
                    <p className="px-4 py-2 text-sm text-zinc-500">No playlists found</p>
                )}
            </div>
        </div>
    );
}

type ArtistSubmenuProps = {
    className: string;
    names: string[];
    onPick: (name: string) => void;
};

// Lists each artist when a track has several.
function ArtistSubmenu({ className, names, onPick }: ArtistSubmenuProps) {
    return (
        <div className={`absolute top-0 max-h-72 w-52 overflow-y-auto ${SURFACE} ${className}`}>
            {names.map((name) => (
                <MenuItem key={name} label={name} onClick={() => onPick(name)} />
            ))}
        </div>
    );
}

type MenuItemProps = {
    label: ReactNode;
    onClick: () => void;
    hasSubmenu?: boolean;
    disabled?: boolean;
};

// One clickable row in the menu. Shows a › when it opens a submenu.
function MenuItem({ label, onClick, hasSubmenu, disabled }: MenuItemProps) {
    return (
        <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={onClick}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        >
            <span className="truncate">{label}</span>
            {hasSubmenu && <span className="ml-2 text-zinc-500">›</span>}
        </button>
    );
}

// Splits the raw artist tag. "Tyler, The Creator" still splits into two names.
function splitArtists(raw?: string): string[] {
    return (raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}
