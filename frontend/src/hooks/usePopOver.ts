import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { KEYS } from "@/config/app-config";

const GAP = 4; // space between the button and the panel
const EDGE = 8; // minimum distance from the window edge

type Position = { top: number; left: number };

// Places a fixed panel next to its anchor button.
// Opens below the button, or above it if there isn't room. Keeps it inside the window.
// Also reports which side submenus should open to.
export function usePopoverPosition(
    open: boolean,
    anchorRef: RefObject<HTMLElement | null>,
    panelRef: RefObject<HTMLElement | null>,
    panelWidth: number,
    submenuWidth: number,
) {
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
    const [submenuSide, setSubmenuSide] = useState<"right" | "left">("right");

    // Runs after render but before paint, so the panel's real height is known.
    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        const panel = panelRef.current;
        if (!open || !anchor || !panel) return;

        const a = anchor.getBoundingClientRect();
        const p = panel.getBoundingClientRect();

        // Below the button if it fits, otherwise above.
        let top = a.bottom + GAP;
        if (top + p.height > window.innerHeight - EDGE) {
            top = Math.max(EDGE, a.top - p.height - GAP);
        }

        // Right edge aligned with the button, kept inside the window.
        let left = a.right - panelWidth;
        left = Math.min(Math.max(left, EDGE), window.innerWidth - panelWidth - EDGE);

        setPosition({ top, left });
        setSubmenuSide(
            left + panelWidth + GAP + submenuWidth > window.innerWidth ? "left" : "right",
        );
    }, [open, anchorRef, panelRef, panelWidth, submenuWidth]);

    return { position, submenuSide };
}

// Calls onDismiss on an outside click, Escape, a window resize,
// or a scroll that happens outside the panel.
export function useDismiss(
    open: boolean,
    onDismiss: () => void,
    anchorRef: RefObject<HTMLElement | null>,
    panelRef: RefObject<HTMLElement | null>,
) {
    useEffect(() => {
        if (!open) return;

        const isInside = (target: EventTarget | null) => {
            const node = target as Node | null;
            if (!node) return false;
            return Boolean(anchorRef.current?.contains(node) || panelRef.current?.contains(node));
        };

        const onMouseDown = (e: MouseEvent) => {
            if (!isInside(e.target)) onDismiss();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === KEYS.closeMenu) onDismiss();
        };
        // Scrolling inside the panel is fine. Any other scroll closes it.
        const onScroll = (e: Event) => {
            if (!panelRef.current?.contains(e.target as Node)) onDismiss();
        };

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onDismiss);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onDismiss);
        };
    }, [open, onDismiss, anchorRef, panelRef]);
}
