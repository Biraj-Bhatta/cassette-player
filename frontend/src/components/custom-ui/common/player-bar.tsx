import {
    Music,
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Track } from "@/types/model";

type PlayerBarProps = {
    track: Track | null;
    playing: boolean;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    shuffle: boolean;
    onToggleShuffle: () => void;
    repeat: boolean;
    onToggleRepeat: () => void;
    time: number;
    duration: number;
    onSeek: (seconds: number) => void;
    volume: number;
    onVolumeChange: (volume: number) => void;
};

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export function PlayerBar({
    track,
    playing,
    onTogglePlay,
    onNext,
    onPrev,
    shuffle,
    onToggleShuffle,
    repeat,
    onToggleRepeat,
    time,
    duration,
    onSeek,
    volume,
    onVolumeChange,
}: PlayerBarProps) {
    return (
        <div className="grid h-24 shrink-0 grid-cols-[1fr_2fr_1fr] items-center gap-4 border-t border-zinc-800 bg-zinc-900 px-4 text-white">
            {/* Track info */}
            <div className="flex min-w-0 items-center gap-3">
                {track?.thumbnail ? (
                    <img
                        src={track.thumbnail}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded object-cover"
                    />
                ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-zinc-700 text-zinc-400">
                            <Music className="h-6 w-6" />
                        </div>
                    )}
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                        {track?.title ?? "Nothing playing"}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                        {track?.artist || "Unknown Artist"}
                    </p>
                </div>
            </div>

            {/* Controls and progress */}
            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleShuffle}
                        aria-label="Shuffle"
                        className={shuffle ? "text-green-500" : ""}
                    >
                        <Shuffle className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onPrev}
                        disabled={!track}
                        aria-label="Previous"
                    >
                        <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={onTogglePlay}
                        disabled={!track}
                        aria-label={playing ? "Pause" : "Play"}
                    >
                        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNext}
                        disabled={!track}
                        aria-label="Next"
                    >
                        <SkipForward className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleRepeat}
                        aria-label="Repeat"
                        className={repeat ? "text-green-500" : ""}
                    >
                        <Repeat className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex w-full max-w-md items-center gap-2 text-xs text-zinc-400">
                    <span className="w-10 text-right tabular-nums">{formatTime(time)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={time}
                        disabled={!track}
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="flex-1 accent-white"
                    />
                    <span className="w-10 tabular-nums">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-end gap-2">
                <Volume2 className="h-4 w-4 text-zinc-400" />
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-24 accent-white"
                />
            </div>
        </div>
    );
}
