import { useEffect, useState, type ComponentType } from "react";
import {
    ChevronsLeft,
    ChevronsRight,
    ListMusic,
    Mic2,
    Music,
    // Cloudy,
    Disc3,
    Download,
    Heart,
    Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KEYS } from "@/config/app-config";

export type View =
    | "cloud"
    | "songs"
    | "artists"
    | "albums"
    | "playlists"
    | "favorites"
    | "downloads"
    | "settings";

type MenuItem = {
    view: View;
    label: string;
    icon: ComponentType<{ className?: string }>;
};

const libraryItems: MenuItem[] = [
    // { view: "cloud", label: "Cloud", icon: Cloudy },
    { view: "songs", label: "All Songs", icon: Music },
    { view: "artists", label: "Artists", icon: Mic2 },
    { view: "albums", label: "Albums", icon: Disc3 },
    { view: "playlists", label: "Playlists", icon: ListMusic },
    { view: "favorites", label: "Favorites", icon: Heart },
];

const otherItems: MenuItem[] = [
    { view: "downloads", label: "Downloads", icon: Download },
    { view: "settings", label: "Settings", icon: Settings },
];

type AppMenuProps = {
    currentView: View;
    onNavigate: (view: View) => void;
};

export function AppMenu({ currentView, onNavigate }: AppMenuProps) {
    const [expanded, setExpanded] = useState(false);

    // Tab expands or collapses the sidebar, from anywhere in the app.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== KEYS.toggleSidebar) return;

            const target = e.target as HTMLElement | null;
            // Leave Tab alone while typing, or while a track menu is open.
            if (target?.closest("input, textarea, select, [contenteditable='true'], [role='menu']")) {
                return;
            }

            e.preventDefault(); // stop focus from moving to the next element
            setExpanded((v) => !v);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const renderItem = ({ view, label, icon: Icon }: MenuItem) => {
        const active = currentView === view;

        return (
            <button
                key={view}
                type="button"
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(view)}
                className={cn(
                    "flex h-10 w-full items-center rounded-md text-sm transition-colors hover:bg-muted",
                    expanded ? "gap-3 px-3" : "justify-center",
                    active && "bg-muted font-medium",
                )}
            >
                <Icon className="h-5 w-5 shrink-0" />
                {expanded && <span className="truncate">{label}</span>}
            </button>
        );
    };

    return (
        <aside
            className={cn(
                "flex h-full shrink-0 flex-col gap-4 border-r bg-background p-2 text-left transition-[width] duration-200",
                expanded ? "w-56" : "w-16",
            )}
        >
            <div className={cn("flex items-center", expanded ? "justify-between px-1" : "justify-center")}>
                {expanded && <span className="font-semibold">Music</span>}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpanded((v) => !v)}
                    aria-label={expanded ? "Collapse menu" : "Expand menu"}
                >
                    {expanded ? (
                        <ChevronsLeft className="h-5 w-5" />
                    ) : (
                        <ChevronsRight className="h-5 w-5" />
                    )}
                </Button>
            </div>

            <nav className="flex flex-col gap-1">
                {expanded && (
                    <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                        Library
                    </p>
                )}
                {libraryItems.map(renderItem)}
            </nav>

            <nav className="mt-auto flex flex-col gap-1 border-t pt-2">
                {otherItems.map(renderItem)}
            </nav>
        </aside>
    );
}
