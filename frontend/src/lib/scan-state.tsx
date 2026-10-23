// lib/scan-state.ts
// Shared scan status. Any component can read it, so the header button and
// the song list both know when a scan is running.
import { useSyncExternalStore } from "react";
import { EventsOn } from "@wails/runtime";

export type ScanStatus = "idle" | "scanning" | "done" | "error";

export type ScanState = {
    status: ScanStatus;
    count: number;
    error: string;
};

let state: ScanState = { status: "idle", count: 0, error: "" };
const listeners = new Set<() => void>();

function update(patch: Partial<ScanState>) {
    state = { ...state, ...patch };
    listeners.forEach((notify) => notify());
}

// Registered once, when this module loads.
EventsOn("scan:started", () => update({ status: "scanning", count: 0, error: "" }));
EventsOn("scan:progress", (saved: number) => update({ count: saved }));
EventsOn("scan:done", (total: number) => update({ status: "done", count: total }));
EventsOn("scan:error", (msg: string) => update({ status: "error", error: msg }));

function subscribe(notify: () => void) {
    listeners.add(notify);
    return () => {
        listeners.delete(notify);
    };
}

const getSnapshot = () => state;

export function useScanState(): ScanState {
    return useSyncExternalStore(subscribe, getSnapshot);
}
