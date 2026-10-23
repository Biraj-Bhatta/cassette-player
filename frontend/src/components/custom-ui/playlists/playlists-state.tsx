// playlists/playlists-state.tsx
import type { ReactNode } from "react";
import { AlertCircle, ListMusic, LoaderCircle, RefreshCw } from "lucide-react";

export type PlaylistsStateProps =
| { type: "loading" }
| { type: "empty" }
| { type: "error"; message?: string; onRetry?: () => void };

export default function PlaylistsState(props: PlaylistsStateProps) {
    switch (props.type) {
        case "loading":
            return (
                <Shell>
                    <IconBadge>
                        <LoaderCircle className="size-8 animate-spin" />
                    </IconBadge>
                    <Title>Loading playlists</Title>
                    <Body>Getting your playlists ready. Please wait a moment.</Body>
                </Shell>
            );

        case "empty":
            return (
                <Shell>
                    <IconBadge>
                        <ListMusic className="size-8" />
                    </IconBadge>
                    <Title>No playlists yet</Title>
                    <Body>
                        Create a playlist with the button above, or use the ⋮ menu on a
                        song to add it to a new one.
                    </Body>
                </Shell>
            );

        case "error":
            return (
                <Shell role="alert">
                    <IconBadge tone="error">
                        <AlertCircle className="size-8" />
                    </IconBadge>
                    <Title>Couldn't load playlists</Title>
                    <Body>{props.message || "Something went wrong while loading playlists."}</Body>
                    {props.onRetry && (
                        <button
                            type="button"
                            onClick={props.onRetry}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:border-black"
                        >
                            <RefreshCw className="size-4" />
                            Try again
                        </button>
                    )}
                </Shell>
            );
    }
}

// Shared layout: centred content, fixed minimum height, same spacing in every state.
function Shell({ children, role = "status" }: { children: ReactNode; role?: "status" | "alert" }) {
    return (
        <section
            role={role}
            aria-live="polite"
            className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center"
        >
            {children}
        </section>
    );
}

function IconBadge({
    children,
    tone = "default",
}: {
        children: ReactNode;
        tone?: "default" | "error";
    }) {
    const toneClass =
        tone === "error" ? "bg-red-100 text-red-600" : "bg-muted text-foreground";

    return (
        <div className={`mb-5 flex size-16 items-center justify-center rounded-2xl ${toneClass}`}>
            {children}
        </div>
    );
}

function Title({ children }: { children: ReactNode }) {
    return <h2 className="text-lg font-semibold text-foreground">{children}</h2>;
}

function Body({ children }: { children: ReactNode }) {
    return (
        <p className="mt-2 max-w-sm text-sm leading-6 text-(--app-text-muted)">{children}</p>
    );
}
