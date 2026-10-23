// hooks/useSettings.ts
import { useEffect, useState } from "react";
import { patchSettings, loadSettings, type Settings } from "@/lib/config-store";

export type { Settings };

export function useSettings() {
    const [current, setCurrent] = useState<Settings | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings()
            .then(setCurrent)
            .catch((err) => setError(String(err)));
    }, []);

    const update = async (patch: Partial<Settings>) => {
        if (!current) return;
        const previous = current;
        setCurrent({ ...current, ...patch });
        try {
            setCurrent(await patchSettings(patch));
        } catch (err) {
            setError(String(err));
            setCurrent(previous);
        }
    };

    return { settings: current, error, update };
}
