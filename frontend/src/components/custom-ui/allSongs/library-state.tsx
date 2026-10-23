// state/library-state.tsx
import type { ReactNode } from "react";
import {
    AlertCircle,
    ArrowUpRight,
    Disc3,
    LoaderCircle,
    Music2,
    RefreshCw,
    Sparkles,
} from "lucide-react";

type LibraryStateProps =
    | { type: "empty" }
    | { type: "loading" }
    | { type: "scanning" }
    | { type: "error"; message?: string; onRetry?: () => void };

export default function LibraryState(props: LibraryStateProps) {
    switch (props.type) {
        case "empty":
            return <EmptyState />;
        case "loading":
            return <LoadingState />;
        case "scanning":
            return <ScanningState />;
        case "error":
            return (
                <ErrorState message={props.message} onRetry={props.onRetry} />
            );
    }
}

// Shared layout for every state: centred content in a fixed-height area.
function Shell({
    children,
    minHeight = "min-h-[300px]",
    role,
}: {
    children: ReactNode;
    minHeight?: string;
    role?: "status" | "alert";
}) {
    return (
        <section
            role={role ?? "status"}
            aria-live="polite"
            className={`flex ${minHeight} flex-col items-center justify-center px-6 py-12 text-center`}
        >
            {children}
        </section>
    );
}

// Round icon badge used at the top of each state.
function IconBadge({
    children,
    tone = "forest",
}: {
    children: ReactNode;
    tone?: "forest" | "error";
}) {
    const toneClass =
        tone === "error" ? "bg-red-100 text-red-600" : "bg-forest/10 text-forest";

    return (
        <div
            className={`mb-5 flex size-16 items-center justify-center rounded-2xl ${toneClass}`}
        >
            {children}
        </div>
    );
}

function EmptyState() {
    return (
        <Shell minHeight="min-h-[360px]">
            {/* Arrow that points toward the Scan button in the header */}
            <div className="absolute right-10 top-30 flex flex-col items-end sm:right-20">
                <div className="flex items-center gap-2 rounded-xl border border-forest/15 bg-white px-3 py-2 shadow-sm">
                    <span className="text-sm font-medium text-forest">
                        Start by scanning your music
                    </span>
                    <ArrowUpRight className="size-5 text-forest" />
                </div>

                <svg
                    viewBox="0 0 100 55"
                    fill="none"
                    className="mr-8 mt-1 h-12 w-24 text-forest/60"
                    aria-hidden="true"
                >
                    <path
                        d="M8 48 C35 48, 35 10, 82 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                    />
                    <path
                        d="M72 3 L83 8 L74 16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            <div className="mt-16">
                <IconBadge>
                    <Music2 className="size-8" />
                </IconBadge>
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-charcoal">
                Your library is waiting
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-charcoal/60">
                No songs here yet. Scan a folder on your computer to bring your
                music into your library.
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-full border border-forest/10 bg-white/60 px-4 py-2 text-xs text-charcoal/60">
                <Disc3 className="size-4 text-forest" />
                Your music stays on your device
            </div>
        </Shell>
    );
}

function ScanningState() {
    return (
        <Shell minHeight="min-h-[360px]">
            <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl bg-forest/10">
                <Music2 className="size-9 text-forest" />
                <span className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border-4 border-backgroundWhite bg-caramel">
                    <LoaderCircle className="size-4 animate-spin text-charcoal" />
                </span>
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest">
                <Sparkles className="size-3.5" />
                Building your music library
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-charcoal">
                Please be patient
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-charcoal/65">
                Your music is being scanned and organized. The first scan can take
                a while, especially with lots of songs. Please keep the app open
                and let it finish.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs text-charcoal/50">
                <LoaderCircle className="size-3.5 animate-spin" />
                Discovering tracks and reading metadata…
            </div>
        </Shell>
    );
}

function LoadingState() {
    return (
        <Shell>
            <IconBadge>
                <LoaderCircle className="size-8 animate-spin" />
            </IconBadge>

            <h2 className="text-lg font-semibold text-charcoal">
                Loading your library
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-charcoal/60">
                Getting your music ready. Please wait a moment.
            </p>
        </Shell>
    );
}

function ErrorState({
    message,
    onRetry,
}: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <Shell role="alert">
            <IconBadge tone="error">
                <AlertCircle className="size-8" />
            </IconBadge>

            <h2 className="text-lg font-semibold text-charcoal">
                Couldn't load your library
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-charcoal/60">
                {message || "Something went wrong while loading your songs."}
            </p>

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-medium text-white transition hover:bg-forest/90"
                >
                    <RefreshCw className="size-4" />
                    Try again
                </button>
            )}
        </Shell>
    );
}
