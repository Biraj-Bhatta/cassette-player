// settings/keyboard-settings.tsx
import { useEffect, useState } from "react";
import { DEFAULT_KEYS, KEYS, type KeyName } from "@/config/app-config";
import { findKeyConflict, resetKeyConfig, saveKeyConfig, type KeyConfig } from "@/lib/config-store";
import { toast } from "@/lib/toast";

const LABELS: Record<KeyName, string> = {
    togglePlay: "Play or pause",
    seekBackward: "Seek back",
    seekForward: "Seek forward",
    nextRow: "Next row",
    previousRow: "Previous row",
    playRow: "Play focused row",
    toggleSidebar: "Show or hide sidebar",
    menuNext: "Next menu item",
    menuPrevious: "Previous menu item",
    closeMenu: "Close menu",
};

const ORDER = Object.keys(LABELS) as KeyName[];

// Turns KeyboardEvent.code into a short label, such as "ArrowLeft" → "←".
function prettyCode(code: string): string {
    const symbols: Record<string, string> = {
        ArrowLeft: "←",
        ArrowRight: "→",
        ArrowUp: "↑",
        ArrowDown: "↓",
        Space: "Space",
    };
    if (symbols[code]) return symbols[code];
    return code.replace(/^Key/, "").replace(/^Digit/, "");
}

export default function KeyboardSettings() {
    const [keys, setKeys] = useState<KeyConfig>({ ...KEYS });
    const [capturing, setCapturing] = useState<KeyName | null>(null);

    // While capturing, the next key pressed becomes the new binding.
    // Capture phase, so it runs before the app's own shortcut handler.
    useEffect(() => {
        if (!capturing) return;

        const onKey = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.code === "Escape") {
                setCapturing(null);
                return;
            }

            const conflict = findKeyConflict(keys, capturing, e.code);
            if (conflict) {
                toast.error(`${prettyCode(e.code)} is already used for “${LABELS[conflict]}”`);
                setCapturing(null);
                return;
            }

            const next = { ...keys, [capturing]: e.code };
            setKeys(next);
            setCapturing(null);
            saveKeyConfig(next)
                .then(() => toast.success(`${LABELS[capturing]} set to ${prettyCode(e.code)}`))
                .catch((err) => toast.error(`Couldn't save: ${err}`));
        };

        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [capturing, keys]);

    const reset = () => {
        resetKeyConfig()
            .then((defaults) => {
                setKeys(defaults);
                toast.success("Shortcuts reset to defaults");
            })
            .catch((err) => toast.error(`Couldn't reset: ${err}`));
    };

    return (
        <div className="space-y-4 text-left">
            <div className="divide-y">
                {ORDER.map((name) => {
                    const isDefault = keys[name] === DEFAULT_KEYS[name];
                    const isCapturing = capturing === name;

                    return (
                        <div key={name} className="flex items-center justify-between gap-4 py-3">
                            <div className="text-sm font-semibold">{LABELS[name]}</div>

                            <button
                                type="button"
                                onClick={() => setCapturing(name)}
                                className={`min-w-28 rounded-md border px-3 py-1.5 font-mono text-sm transition ${
                                    isCapturing
                                        ? "border-black bg-black text-white"
                                        : "hover:border-black"
                                } ${isDefault ? "" : "font-semibold"}`}
                            >
                                {isCapturing ? "Press a key…" : prettyCode(keys[name])}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-3">
                <p className="text-left text-xs text-(--app-text-muted)">
                    Click a shortcut, then press the new key. Escape cancels and can't be assigned.
                </p>
                <div>
                    <button
                        type="button"
                        onClick={reset}
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-black"
                    >
                        Reset to defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
