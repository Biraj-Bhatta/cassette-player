// albums/cover.tsx

// Turns the stored thumbnail into an image source.
// Works whether the value is already a data URL or raw base64.
export const coverSrc = (t: string) =>
    !t ? "" : t.startsWith("data:") ? t : `data:image/jpeg;base64,${t}`;

// Built-in placeholder drawn as SVG, so no image file is needed.
const DEFAULT_COVER =
    "data:image/svg+xml;utf8," +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#262626"/>
<circle cx="50" cy="50" r="22" fill="none" stroke="#737373" stroke-width="4"/>
<circle cx="50" cy="50" r="6" fill="#737373"/>
</svg>`
        );

// If you want to use an image file instead:
// 1. Put the file in your frontend assets folder, e.g. src/assets/default-cover.png
// 2. Uncomment the import below and delete DEFAULT_COVER above.
//
// import defaultCover from "../../assets/default-cover.png";
// const DEFAULT_COVER = defaultCover;

type Props = {
    thumbnail: string;
    className?: string;
};

export default function Cover({ thumbnail, className = "" }: Props) {
    const src = coverSrc(thumbnail) || DEFAULT_COVER;

    return (
        <img
            src={src}
            alt=""
            className={`h-full w-full object-cover ${className}`}
        />
    );
}
