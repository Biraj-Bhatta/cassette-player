// favourites/favourites-state.tsx
import type { ReactNode } from "react";
import { AlertCircle, Heart, LoaderCircle, RefreshCw } from "lucide-react";

export type FavouritesStateProps =
| { type: "loading" }
| { type: "scanning" }
| { type: "empty" }
| { type: "error"; message?: string; onRetry?: () => void };

export default function FavouritesState(props: FavouritesStateProps) {
    switch (props.type) {
        case "loading":
            return (
                <Shell>
                    <IconBadge>
                        <LoaderCircle className="size-8 animate-spin" />
                    </IconBadge>
                    <Title>Loading favourites</Title>
                    <Body>Getting your favourite songs ready. Please wait a moment.</Body>
                </Shell>
            );

        case "scanning":
            return (
                <Shell>
                    <IconBadge>
                        <LoaderCircle className="size-8 animate-spin" />
                    </IconBadge>
                    <Title>Building your library</Title>
                    <Body>
                        Your music is being scanned. Favourites will appear here when the
                        scan finishes.
                    </Body>
                </Shell>
            );

        case "empty":
            return (
                <Shell>
                    <IconBadge>
                        <Heart className="size-8" />
                    </IconBadge>
                    <Title>No favourites yet</Title>
                    <Body>Use the ⋮ menu on any song and choose “Add to favourites”.</Body>
                </Shell>
            );

        case "error":
            return (
                <Shell role="alert">
                    <IconBadge tone="error">
                        <AlertCircle className="size-8" />
                    </IconBadge>
                    <Title>Couldn't load favourites</Title>
                    <Body>{props.message || "Something went wrong while loading favourites."}</Body>
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
