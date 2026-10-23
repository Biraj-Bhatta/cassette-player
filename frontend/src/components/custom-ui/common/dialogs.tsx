// common/dialogs.tsx
import { useEffect, useState, type ReactNode } from "react";

// Dark backdrop. Escape or a click outside closes it.
function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-sm rounded-xl bg-white p-6 text-black shadow-2xl"
            >
                {children}
            </div>
        </div>
    );
}

type PromptProps = {
    title: string;
    initialValue?: string;
    submitLabel?: string;
    onSubmit: (value: string) => Promise<void> | void;
    onClose: () => void;
};

// Asks for one line of text, such as a playlist name.
export function PromptDialog({
    title,
    initialValue = "",
    submitLabel = "Save",
    onSubmit,
    onClose,
}: PromptProps) {
    const [value, setValue] = useState(initialValue);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const name = value.trim();
        if (!name || busy) return;
        setBusy(true);
        setError(null);
        try {
            await onSubmit(name);
        } catch (err) {
            setError(String(err));
            setBusy(false);
        }
    };

    return (
        <Overlay onClose={onClose}>
            <h3 className="text-lg font-bold">{title}</h3>

            <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                }}
                maxLength={100}
                placeholder="Playlist name"
                className="mt-4 w-full rounded-md border px-3 py-2 outline-none focus:border-black"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm hover:bg-neutral-100"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={!value.trim() || busy}
                    className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                    {submitLabel}
                </button>
            </div>
        </Overlay>
    );
}

type ConfirmProps = {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
    onClose: () => void;
};

// Asks the user to confirm an action, such as deleting a playlist.
export function ConfirmDialog({
    title,
    message,
    confirmLabel = "Delete",
    onConfirm,
    onClose,
}: ConfirmProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirm = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err) {
            setError(String(err));
            setBusy(false);
        }
    };

    return (
        <Overlay onClose={onClose}>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{message}</p>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm hover:bg-neutral-100"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={confirm}
                    disabled={busy}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                    {confirmLabel}
                </button>
            </div>
        </Overlay>
    );
}
