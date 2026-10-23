// src/hooks/usePlayer.ts
//
// Owns everything about audio playback:
//   - the audio element (via a ref)
//   - the queue and which track is playing
//   - play, pause, seek, next, previous, shuffle, repeat, volume
//
// Audio is streamed from a local URL, so seeking works without loading the whole file.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track } from "@/types/model";
import { GetAudioURL } from "@wails/go/main/App";

export function usePlayer() {
    // ----- Refs -----

    // The single <audio> element. App.tsx attaches this ref to it.
    const audioRef = useRef<HTMLAudioElement>(null);

    // True when the user wants audio to play. Read after a new source loads,
    // so a song picked from a list starts as soon as it is ready.
    const playRequested = useRef(false);

    // ----- State -----

    const [time, setTime] = useState(0);         // current position in seconds
    const [duration, setDuration] = useState(0); // total length in seconds
    const [volume, setVolume] = useState(1);     // 0 to 1
    const [queue, setQueue] = useState<Track[]>([]);
    const [index, setIndex] = useState(-1);      // position in the queue, -1 = nothing
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState(false);
    const [playing, setPlaying] = useState(false);

    // The track being played, or null when nothing is selected.
    const current = index >= 0 ? (queue[index] ?? null) : null;

    // ----- Loading -----

    // Runs whenever the current track changes. Asks the backend for a streaming
    // URL and starts playback if the user already asked for it.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !current) return;

        setTime(0);
        setDuration(0);

        // If the track changes again before this request finishes, ignore the old result.
        let cancelled = false;

        GetAudioURL(current.id, current.path)
            .then((url) => {
                if (cancelled) return;
                audio.src = url;
                audio.load();
                if (playRequested.current) {
                    audio.play().catch((err) => console.error("play failed:", err));
                }
            })
            .catch((err: unknown) => console.error("Failed to load audio:", err));

        return () => {
            cancelled = true;
        };
    }, [current?.id]);

    // ----- Queue -----

    // Replaces the queue with a list and starts playing the track at position i.
    const playList = (list: Track[], i: number) => {
        playRequested.current = true;

        const sameTrack = i === index && list[i]?.id === current?.id;
        setQueue(list);
        setIndex(i);

        // Same song clicked again: the loader won't run, so play directly.
        if (sameTrack) {
            audioRef.current?.play().catch((err) => console.error("play failed:", err));
        }
    };

    // ----- Play and pause -----

    // Switches between play and pause. Used by the Space key and the play button.
    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !current) return;

        if (audio.paused) {
            playRequested.current = true;
            audio.play().catch((err) => console.error("play failed:", err));
        } else {
            playRequested.current = false;
            audio.pause();
        }
    }, [current]);

    // ----- Seeking -----

    // Jumps forward or back by a number of seconds, staying inside the track.
    const seekBy = useCallback((seconds: number) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
    }, []);

    // Jumps to an exact position. Used by the progress bar.
    const handleSeek = (seconds: number) => {
        if (audioRef.current) audioRef.current.currentTime = seconds;
        setTime(seconds);
    };

    // ----- Next and previous -----

    // Plays the next track. With shuffle on, picks a different random track.
    // At the end of the queue, wraps to the start only when repeat is on.
    const next = () => {
        if (queue.length === 0) return;
        playRequested.current = true;

        if (shuffle && queue.length > 1) {
            setIndex((prevIndex) => {
                let r = prevIndex;
                while (r === prevIndex) r = Math.floor(Math.random() * queue.length);
                return r;
            });
            return;
        }

        setIndex((i) => (i + 1 < queue.length ? i + 1 : repeat ? 0 : i));
    };

    // Plays the previous track, wrapping from the first track to the last.
    const prev = () => {
        if (queue.length === 0) return;
        playRequested.current = true;
        setIndex((i) => (i - 1 + queue.length) % queue.length);
    };

    // ----- Volume -----

    // Sets the volume from the volume slider (0 to 1).
    const handleVolumeChange = (v: number) => {
        if (audioRef.current) audioRef.current.volume = v;
        setVolume(v);
    };

    // Changes the volume by a small step. Used by the mouse wheel over the player bar.
    const changeVolumeFromScroll = useCallback((delta: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        const next = Math.min(1, Math.max(0, audio.volume + delta));
        audio.volume = next;
        setVolume(next);
    }, []);

    // ----- Track ended -----

    // Called by the <audio> element when a track finishes.
    const handleEnded = () => {
        const atEnd = index + 1 >= queue.length;

        if (atEnd && !repeat && !shuffle) {
            setPlaying(false);
            return;
        }

        if (queue.length === 1) {
            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch((err) => console.error("play failed:", err));
            }
            return;
        }

        next();
    };

    // ----- Shuffle and repeat -----

    // Turning shuffle on turns repeat off, and the other way around.
    const toggleShuffle = () => {
        setShuffle((prev) => {
            if (!prev) setRepeat(false);
            return !prev;
        });
    };

    const toggleRepeat = () => {
        setRepeat((prev) => {
            if (!prev) setShuffle(false);
            return !prev;
        });
    };

    // ----- Return -----

    return {
        audioRef,
        current,
        queue,
        playing,
        time,
        duration,
        volume,
        shuffle,
        repeat,

        playList,
        togglePlay,
        seekBy,
        next,
        prev,
        handleSeek,
        handleVolumeChange,
        changeVolumeFromScroll,
        handleEnded,
        toggleShuffle,
        toggleRepeat,

        // The <audio> element's events call these to keep state in sync.
        setPlaying,
        setTime,
        setDuration,
    };
}
