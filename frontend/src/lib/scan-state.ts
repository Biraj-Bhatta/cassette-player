// lib/scan-state.ts
import { useSyncExternalStore } from "react";
import { EventsOn } from "@wails/runtime";

export type ScanStatus = "idle" | "scanning" | "done" | "error";

export type ScanState = {
    status: ScanStatus;
    count: number;
    error: string;
    // True when the library already had songs, so the scan runs quietly.
    background: boolean;
};

type ScanStartedPayload = { dir: string; background: boolean };

let state: ScanState = { status: "idle", count: 0, error: "", background: false };
const listeners = new Set<() => void>();

function update(patch: Partial<ScanState>) {
    state = { ...state, ...patch };
    listeners.forEach((notify) => notify());
}

// Registered once, when this module loads.
EventsOn("scan:started", (p?: ScanStartedPayload) =>
    update({ status: "scanning", count: 0, error: "", background: !!p?.background }),
);
EventsOn("scan:progress", (saved: number) => update({ count: saved }));
EventsOn("scan:done", (total: number) => update({ status: "done", count: total, background: false }));
EventsOn("scan:error", (msg: string) => update({ status: "error", error: msg, background: false }));

function subscribe(notify: () => void) {
    listeners.add(notify);
    return () => {
        listeners.delete(notify);
    };
}

// Full state. Only the header button uses it.
export function useScanState(): ScanState {
    return useSyncExternalStore(subscribe, () => state);
}

// True only for a first scan. Screens use this, and it returns a boolean,
// so they don't re-render on every progress update.
export function useBlockingScan(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => state.status === "scanning" && !state.background,
    );
}
