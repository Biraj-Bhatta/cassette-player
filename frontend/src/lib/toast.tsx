// lib/toast.tsx
import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "info" | "error";
type Toast = { id: number; kind: ToastKind; message: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((notify) => notify());
const subscribe = (notify: () => void) => {
    listeners.add(notify);
    return () => {
        listeners.delete(notify);
    };
};
const getSnapshot = () => toasts;

export function dismissToast(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

function push(kind: ToastKind, message: string, duration = 3000) {
    const id = nextId++;
    toasts = [...toasts, { id, kind, message }];
    emit();
    setTimeout(() => dismissToast(id), duration);
}

export const toast = {
    success: (message: string) => push("success", message),
    info: (message: string) => push("info", message),
    error: (message: string) => push("error", message, 4500),
};

const STYLE: Record<ToastKind, { bg: string; icon: string }> = {
    success: { bg: "bg-green-600", icon: "✓" },
    info: { bg: "bg-neutral-800", icon: "i" },
    error: { bg: "bg-red-600", icon: "!" },
};

// Renders the active toasts. Place it once, near the bottom of App.
export function Toaster() {
    const items = useSyncExternalStore(subscribe, getSnapshot);

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-30 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
        >
            {items.map((t) => (
                <div
                    key={t.id}
                    role="status"
                    className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg ${STYLE[t.kind].bg}`}
                >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                        {STYLE[t.kind].icon}
                    </span>
                    <span className="truncate">{t.message}</span>
                    <button
                        type="button"
                        aria-label="Dismiss"
                        onClick={() => dismissToast(t.id)}
                        className="ml-1 shrink-0 text-white/70 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
