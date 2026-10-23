// lib/config-store.ts
import { GetSettings, SaveSettings } from "@wails/go/main/App";
import type { settings as goSettings } from "@wails/go/models";
import {
    applyKeyConfig,
    applyPlayerConfig,
    DEFAULT_KEYS,
    type KeyName,
} from "@/config/app-config";

// Shape of settings.json. Written out by hand so the build doesn't depend on
// the generated models file. It matches the Go struct in internal/settings.
export type PlayerConfig = { seekSeconds: number; volumeStep: number };
export type KeyConfig = Record<KeyName, string>;

export type Settings = {
    musicFolders: string[];
    defaultVolume: number;
    player: PlayerConfig;
    keys: KeyConfig;
};

// Bridge to the Go bindings. Remove these casts once models.ts includes
// player and keys.
const readSettings = async (): Promise<Settings> =>
    (await GetSettings()) as unknown as Settings;

const writeSettings = (s: Settings) =>
    SaveSettings(s as unknown as goSettings.Settings);

// Loads saved settings into PLAYER and KEYS. Call once before the first render.
export async function loadConfig(): Promise<void> {
    try {
        const s = await readSettings();
        applyPlayerConfig(s.player);
        applyKeyConfig(s.keys);
    } catch (err) {
        console.error("Could not load settings, using defaults:", err);
    }
}
export const loadSettings = readSettings;

// Reads the current settings, applies the patch, and saves the full object.
// Re-reading first means separate changes don't overwrite each other.
export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await readSettings();
    const next: Settings = { ...current, ...patch };
    await writeSettings(next);
    return next;
}

export async function savePlayerConfig(p: PlayerConfig): Promise<void> {
    applyPlayerConfig(p);
    await patchSettings({ player: p });
}

// Returns the action that already uses this key code, or null.
export function findKeyConflict(keys: KeyConfig, action: KeyName, code: string): KeyName | null {
    for (const name of Object.keys(keys) as KeyName[]) {
        if (name !== action && keys[name] === code) return name;
    }
    return null;
}

export async function saveKeyConfig(keys: KeyConfig): Promise<void> {
    applyKeyConfig(keys);
    await patchSettings({ keys });
}

export async function resetKeyConfig(): Promise<KeyConfig> {
    const defaults: KeyConfig = { ...DEFAULT_KEYS };
    await saveKeyConfig(defaults);
    return defaults;
}
