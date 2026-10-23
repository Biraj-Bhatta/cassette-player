import { useEffect, type RefObject } from "react";
import { KEYS, PLAYER } from "@/config/app-config";

interface Options {
    togglePlay: () => void;
    seekBy: (seconds: number) => void;
    changeVolume: (delta: number) => void;
}

const SELECTORS = {
    row: "[data-track-row]",
    menu: "[role='menu']",
    menuItem: "[role='menuitem']:not(:disabled)",
};

const isTypingTarget = (el: HTMLElement) =>
    Boolean(el.closest("input, textarea, select, [contenteditable='true']"));

// Moves focus within `items`. From "nothing focused" (-1), Down goes to the first item and Up to the last.
function focusItem(items: HTMLElement[], current: number, direction: 1 | -1) {
    if (items.length === 0) return;

    const next =
        current === -1
            ? direction === 1
                ? 0
                : items.length - 1
            : Math.min(Math.max(current + direction, 0), items.length - 1);

    items[next].focus();
    items[next].scrollIntoView({ block: "nearest" });
}

// Up/Down inside an open track menu. Enter and Escape are handled by the buttons and the menu itself.
function handleMenuKey(e: KeyboardEvent, target: HTMLElement, panel: HTMLElement) {
    if (e.code !== KEYS.menuNext && e.code !== KEYS.menuPrevious) return;

    e.preventDefault();
    const items = Array.from(panel.querySelectorAll<HTMLElement>(SELECTORS.menuItem));
    // -1 when focus is on the playlist search box, so the first arrow press lands on an item.
    const current = items.indexOf(target);
    focusItem(items, current, e.code === KEYS.menuNext ? 1 : -1);
}

export function useKeyboardShortcuts(
    { togglePlay, seekBy, changeVolume }: Options,
    wheelTargetRef: RefObject<HTMLElement | null>,
) {
    // Keyboard: global shortcuts plus row and menu navigation
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            // 1. Inside an open track menu: only menu navigation.
            const menu = target.closest<HTMLElement>(SELECTORS.menu);
            if (menu) {
                handleMenuKey(e, target, menu);
                return;
            }

            // 2. Typing in a field: leave every key alone.
            if (isTypingTarget(target)) return;

            // 3. Global playback and row navigation
            switch (e.code) {
                case KEYS.togglePlay:
                    e.preventDefault();
                    if (e.repeat) return; // holding Space shouldn't flicker play/pause
                    // Stop a focused button from also firing its click on Space.
                    (document.activeElement as HTMLElement | null)?.blur();
                    togglePlay();
                    break;

                case KEYS.seekBackward:
                    e.preventDefault();
                    seekBy(-PLAYER.seekSeconds);
                    break;

                case KEYS.seekForward:
                    e.preventDefault();
                    seekBy(PLAYER.seekSeconds);
                    break;

                case KEYS.nextRow:
                case KEYS.previousRow: {
                    e.preventDefault();
                    const rows = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.row));
                    const row = target.closest<HTMLElement>(SELECTORS.row);
                    const current = row ? rows.indexOf(row) : -1;
                    focusItem(rows, current, e.code === KEYS.nextRow ? 1 : -1);
                    break;
                }
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [togglePlay, seekBy]);

    // Wheel: only over the player element
    useEffect(() => {
        const el = wheelTargetRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            changeVolume(e.deltaY < 0 ? PLAYER.volumeStep : -PLAYER.volumeStep);
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [changeVolume, wheelTargetRef]);
}
