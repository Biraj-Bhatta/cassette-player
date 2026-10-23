// config/app-config.ts
// Defaults plus the live values the app reads.
// PLAYER and KEYS are updated in place by config-store.ts, so code that reads
// PLAYER.seekSeconds or KEYS.playRow at event time always gets the current value.

export const DEFAULT_PLAYER = {
    seekSeconds: 15,  // Left / Right arrow jump
    volumeStep: 0.05, // mouse wheel step over the player bar
};

// KeyboardEvent.code values. Full list: https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code
export const DEFAULT_KEYS = {
    togglePlay: "Space",
    seekBackward: "ArrowLeft",
    seekForward: "ArrowRight",
    nextRow: "ArrowDown",
    previousRow: "ArrowUp",
    playRow: "Enter",
    toggleSidebar: "Tab",
    menuNext: "ArrowDown",
    menuPrevious: "ArrowUp",
    closeMenu: "Escape",
} as const;

export type KeyName = keyof typeof DEFAULT_KEYS;

// Live values. Mutated in place, never replaced, so importers keep the same objects.
export const PLAYER = { ...DEFAULT_PLAYER };
export const KEYS: Record<KeyName, string> = { ...DEFAULT_KEYS };

// Keys that count as "navigation" for hiding the mouse pointer. Kept in sync with KEYS.
export const NAV_KEYS: string[] = [];

function refreshNavKeys() {
    NAV_KEYS.splice(
        0,
        NAV_KEYS.length,
        KEYS.nextRow,
        KEYS.previousRow,
        KEYS.seekBackward,
        KEYS.seekForward,
        KEYS.playRow,
        KEYS.toggleSidebar,
        KEYS.menuNext,
        KEYS.menuPrevious,
        KEYS.closeMenu,
        KEYS.togglePlay,
    );
}
refreshNavKeys();

export function applyPlayerConfig(p: Partial<typeof DEFAULT_PLAYER>) {
    Object.assign(PLAYER, p);
}

export function applyKeyConfig(k: Partial<Record<KeyName, string>>) {
    Object.assign(KEYS, k);
    refreshNavKeys();
}
