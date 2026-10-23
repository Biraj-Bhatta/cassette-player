import type { ReactNode } from "react";
import { KEYS } from "@/config/app-config";
import TrackMenu from "@/components/custom-ui/common/track-menu";
import type { TrackActions } from "@/types/model";

export type TrackData = {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    thumbnail?: string;
    duration?: number; // nanoseconds
};

type ListUiProps<T extends TrackData> = {
    items: T[];
    onPlay: (list: T[], index: number) => void;
    currentId?: string | null;
    // Standard menu, built from the shared handlers. Used when renderMenu is not given.
    actions?: TrackActions;
    // Custom menu for each row. Replaces the standard TrackMenu when provided.
    renderMenu?: (item: T) => ReactNode;
};

// Converts nanoseconds to m:ss.
export function formatDuration(ns: number): string {
    const total = Math.floor(ns / 1_000_000_000);
    const minutes = Math.floor(total / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

// Renders the list. Each row is a TrackRow.
export default function ListUi<T extends TrackData>({
    items,
    onPlay,
    currentId,
    actions,
    renderMenu,
}: ListUiProps<T>) {
    return (
        <div className="flex flex-col gap-2">
            {items.map((item, i) => (
                <TrackRow
                    key={item.id}
                    item={item}
                    index={i}
                    isPlaying={item.id === currentId}
                    onPlay={() => onPlay(items, i)}
                    actions={actions}
                    renderMenu={renderMenu}
                />
            ))}
        </div>
    );
}

type TrackRowProps<T extends TrackData> = {
    item: T;
    index: number;
    isPlaying: boolean;
    onPlay: () => void;
    actions?: TrackActions;
    renderMenu?: (item: T) => ReactNode;
};

// One row: number, thumbnail, title, duration, and the menu.
function TrackRow<T extends TrackData>({
    item,
    index,
    isPlaying,
    onPlay,
    actions,
    renderMenu,
}: TrackRowProps<T>) {
    return (
        <div
            role="button"
            tabIndex={0}
            data-track-row
            onClick={onPlay}
            onKeyDown={(e) => {
                // Only when the row itself is focused, so Enter on the ⋮ button opens the menu instead.
                if (e.code === KEYS.playRow && e.target === e.currentTarget) onPlay();
            }}
            aria-current={isPlaying ? "true" : undefined}
            className={`flex cursor-pointer items-center gap-3 rounded border p-3 text-left
text-foreground outline-none transition-colors pointer:hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-foreground ${
isPlaying ? "border-foreground bg-muted ring-1 ring-foreground" : ""
}`}
        >
            <span className="w-8 shrink-0 text-center font-bold">
                {isPlaying ? "▶" : index + 1}
            </span>

            {item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
            ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-darktext text-lighttext">
                        ♪
                    </div>
                )}

            <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${isPlaying ? "text-primary" : ""}`}>
                    {item.title}
                </p>
                <p className="truncate text-sm text-zinc-400">{item.artist || "Unknown Artist"}</p>
            </div>

            <span className="shrink-0 text-sm text-zinc-500">
                {item.duration !== undefined ? formatDuration(item.duration) : ""}
            </span>

            {/* Custom menu wins. Otherwise use the standard menu, if actions were given. */}
            {renderMenu ? renderMenu(item) : actions && <TrackMenu track={item} actions={actions} />}
        </div>
    );
}
