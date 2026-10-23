// artists/artists-state.tsx
import type { ReactNode } from "react";
import { AlertCircle, Disc3, LoaderCircle, Music2, RefreshCw, Search } from "lucide-react";

export type ArtistsStateProps =
| { type: "loading" }
| { type: "scanning" }
| { type: "empty" }
| { type: "no-matches"; query: string }
| { type: "error"; message?: string; onRetry?: () => void };

export default function ArtistsState(props: ArtistsStateProps) {
    switch (props.type) {
        case "loading":
            return (
                <Shell>
                    <IconBadge>
                        <LoaderCircle className="size-8 animate-spin" />
                    </IconBadge>
                    <Title>Loading artists</Title>
                    <Body>Getting your artists ready. Please wait a moment.</Body>
                </Shell>
            );

        case "scanning":
            return (
                <Shell>
                    <IconBadge>
                        <Disc3 className="size-8 animate-spin" />
                    </IconBadge>
                    <Title>Building your artists</Title>
                    <Body>
                        Your music is being scanned. Artists will appear here when the
                        scan finishes.
                    </Body>
                </Shell>
            );

        case "empty":
            return (
                <Shell>
                    <IconBadge>
                        <Music2 className="size-8" />
                    </IconBadge>
                    <Title>No artists yet</Title>
                    <Body>Scan a folder that contains music to see artists here.</Body>
                </Shell>
            );

        case "no-matches":
            return (
                <Shell>
                    <IconBadge>
                        <Search className="size-8" />
                    </IconBadge>
                    <Title>No artists found</Title>
                    <Body>{`Nothing matches “${props.query.trim()}”. Try a different search.`}</Body>
                </Shell>
            );

        case "error":
            return (
                <Shell role="alert">
                    <IconBadge tone="error">
                        <AlertCircle className="size-8" />
                    </IconBadge>
                    <Title>Couldn't load artists</Title>
                    <Body>{props.message || "Something went wrong while loading artists."}</Body>
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
