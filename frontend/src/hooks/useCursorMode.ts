// src/hooks/use-cursor-mode.ts
import { useEffect } from "react";
import { NAV_KEYS } from "@/config/app-config";

export function useCursorMode() {
    useEffect(() => {
        const root = document.documentElement;

        const hide = () => root.classList.add("keyboard-nav");
        const show = () => root.classList.remove("keyboard-nav");

        // Any key from the config hides the pointer.
        const onKeyDown = (e: KeyboardEvent) => {
            if ((NAV_KEYS as readonly string[]).includes(e.code)) hide();
        };

        // Only real movement shows it again. Ignoring tiny jitter avoids flicker.
        let lastX = -1;
        let lastY = -1;
        const onMouseMove = (e: MouseEvent) => {
            if (Math.abs(e.clientX - lastX) < 2 && Math.abs(e.clientY - lastY) < 2) return;
            lastX = e.clientX;
            lastY = e.clientY;
            show();
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("mousemove", onMouseMove);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("mousemove", onMouseMove);
            root.classList.remove("keyboard-nav");
        };
    }, []);
}
