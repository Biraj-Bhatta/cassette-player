// settings/settings-screen.tsx
import { useEffect, useState, type ReactNode } from "react";
import {
    ClearThumbnailCache,
    GetDataLocation,
    PickFolder,
    ScanAllFolders,
    ScanFolder,
} from "@wails/go/main/App";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "@/lib/toast";
import PlayerSettings from "@/components/custom-ui/settings/player-settings";
import KeyboardSettings from "@/components/custom-ui/settings/keyboard-settings";

// Shared button styles, so every action in the screen looks the same.
const BTN_PRIMARY =
    "rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40";
const BTN_SECONDARY =
    "rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-black disabled:opacity-40";
const BTN_DANGER = "rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50";

export default function SettingsScreen() {
    const { settings, error, update } = useSettings();
    const [dataDir, setDataDir] = useState("");

    // Startup volume is dragged locally and saved when the pointer is released.
    const [dragVolume, setDragVolume] = useState<number | null>(null);

    useEffect(() => {
        GetDataLocation()
            .then(setDataDir)
            .catch(() => setDataDir("unknown"));
    }, []);

    if (error) {
        return <p className="p-6 text-left text-(--app-danger)">Settings error: {error}</p>;
    }
    if (!settings) {
        return <p className="p-6 text-left text-(--app-text-muted)">Loading settings…</p>;
    }

    const addFolder = async () => {
        const dir = await PickFolder();
        if (!dir) return;

        if (settings.musicFolders.includes(dir)) {
            toast.info("That folder is already in your list");
            return;
        }

        await update({ musicFolders: [...settings.musicFolders, dir] });
        ScanFolder(dir).catch((err) => toast.error(String(err)));
        toast.success("Folder added. Scanning…");
    };

    const removeFolder = (dir: string) => {
        update({ musicFolders: settings.musicFolders.filter((f) => f !== dir) });
    };

    const scanAll = () => {
        ScanAllFolders()
            .then(() => toast.info("Scanning all folders…"))
            .catch((err) => toast.error(String(err)));
    };

    const clearCovers = () => {
        ClearThumbnailCache()
            .then(() => toast.success("Cover cache cleared"))
            .catch((err) => toast.error(`Couldn't clear covers: ${err}`));
    };

    const commitVolume = () => {
        if (dragVolume !== null) {
            update({ defaultVolume: dragVolume });
        }
        setDragVolume(null);
    };

    const shownVolume = dragVolume ?? settings.defaultVolume;

    return (
        <div className="max-w-3xl space-y-6 p-6 text-left">
            <Section
                title="Music folders"
                description="Songs are scanned from these folders. Removing a folder doesn't delete songs already in your library."
            >
                {settings.musicFolders.length === 0 ? (
                    <p className="text-sm text-(--app-text-muted)">No folders added yet.</p>
                ) : (
                        <ul className="space-y-2">
                            {settings.musicFolders.map((dir) => (
                                <li
                                    key={dir}
                                    className="flex items-center justify-between gap-4 rounded-md border px-4 py-3"
                                >
                                    <span className="min-w-0 truncate text-left text-sm" title={dir}>
                                        {dir}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeFolder(dir)}
                                        className={BTN_DANGER}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={addFolder} className={BTN_PRIMARY}>
                        Add folder
                    </button>
                    <button
                        type="button"
                        onClick={scanAll}
                        disabled={settings.musicFolders.length === 0}
                        className={BTN_SECONDARY}
                    >
                        Scan all folders
                    </button>
                </div>
            </Section>

            <Section
                title="Startup volume"
                description="The volume the player uses when the app opens. Changing it doesn't affect the song that's playing."
            >
                <SettingRow label="Default volume" value={`${shownVolume}%`}>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={shownVolume}
                        onChange={(e) => setDragVolume(Number(e.target.value))}
                        onPointerUp={commitVolume}
                        onKeyUp={commitVolume}
                        className="w-full max-w-md accent-black"
                    />
                </SettingRow>
            </Section>

            <Section title="Playback" description="Seek amount and mouse wheel volume step. Changes are saved as you make them.">
                <PlayerSettings />
            </Section>

            <Section
                title="Keyboard shortcuts"
                description="Click a shortcut to change it. Your choices are saved."
            >
                <KeyboardSettings />
            </Section>

            <Section title="Library and storage">
                <SettingRow
                    label="Cover image cache"
                    description="Cached covers are rebuilt on the next scan. Your songs are not affected."
                >
                    <div>
                        <button type="button" onClick={clearCovers} className={BTN_SECONDARY}>
                            Clear cache
                        </button>
                    </div>
                </SettingRow>

                <SettingRow
                    label="Data folder"
                    description="Holds your library database, favourites, playlists, and settings."
                >
                    <p className="break-all text-left font-mono text-sm text-(--app-text-muted)">
                        {dataDir || "Loading…"}
                    </p>
                </SettingRow>
            </Section>

            <p className="text-left text-xs text-(--app-text-muted)">Cassette Player</p>
        </div>
    );
}

// A titled card. Heading, description, and content are all left aligned,
// with the same spacing in every section.
function Section({
    title,
    description,
    children,
}: {
        title: string;
        description?: string;
        children: ReactNode;
    }) {
    return (
        <section className="space-y-4 rounded-xl border p-6 text-left">
            <div className="space-y-1">
                <h2 className="text-lg font-bold">{title}</h2>
                {description && (
                    <p className="text-sm text-(--app-text-muted)">{description}</p>
                )}
            </div>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

// One setting: a label (and optional description) above its control.
// The value, if given, sits on the label line to the right.
function SettingRow({
    label,
    description,
    value,
    children,
}: {
        label: string;
        description?: string;
        value?: string;
        children: ReactNode;
    }) {
    return (
        <div className="space-y-2 text-left">
            <div className="flex items-baseline justify-between gap-4">
                <div className="space-y-0.5">
                    <div className="text-sm font-semibold">{label}</div>
                    {description && (
                        <div className="text-sm text-(--app-text-muted)">{description}</div>
                    )}
                </div>
                {value && <span className="shrink-0 tabular-nums text-sm">{value}</span>}
            </div>
            {children}
        </div>
    );
}
