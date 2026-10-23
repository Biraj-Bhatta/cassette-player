export const AVATAR_CLASSES = [
    "from-(--app-avatar-0-from) to-(--app-avatar-0-to)",
    "from-(--app-avatar-1-from) to-(--app-avatar-1-to)",
    "from-(--app-avatar-2-from) to-(--app-avatar-2-to)",
    "from-(--app-avatar-3-from) to-(--app-avatar-3-to)",
    "from-(--app-avatar-4-from) to-(--app-avatar-4-to)",
    "from-(--app-avatar-5-from) to-(--app-avatar-5-to)",
    "from-(--app-avatar-6-from) to-(--app-avatar-6-to)",
    "from-(--app-avatar-7-from) to-(--app-avatar-7-to)",
];

export function avatarIndex(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return hash % AVATAR_CLASSES.length;
}

export function ArtistAvatar({
    id,
    name,
    onPlay,
}: {
        id: string;
        name: string;
        onPlay?: () => void;
    }) {
    return (
        <div className="relative w-full">
            <div
                aria-label={name}
                className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-full bg-linear-to-br shadow-(--app-card-shadow) ${AVATAR_CLASSES[avatarIndex(id)]}`}
            >
                <svg viewBox="0 0 24 24" className="h-[60%] w-[60%] fill-(--app-avatar-icon)">
                    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-3.5 0-8.25 1.76-8.25 5.25V21h16.5v-1.5c0-3.49-4.75-5.25-8.25-5.25Z" />
                </svg>
            </div>

            <button
                type="button"
                aria-label={`Play ${name}`}
                onClick={(e) => {
                    // Keep the click from also selecting the card.
                    e.stopPropagation();
                    onPlay?.();
                }}
                className="absolute right-3 bottom-3 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 hover:scale-105"
            >
                <svg viewBox="0 0 24 24" className="ml-0.5 size-5 fill-current">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </button>
        </div>
    );
}
