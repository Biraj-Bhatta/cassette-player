import { SearchBox } from "@/components/custom-ui/landingPage/search-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SearchField = "all" | "song" | "artist" | "album";

const fields: { value: SearchField; label: string }[] = [
  { value: "all", label: "All" },
  { value: "song", label: "Songs" },
  { value: "artist", label: "Artists" },
  { value: "album", label: "Albums" },
];

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
};

// Filters a list of tracks by the query, limited to the chosen field.
export function filterTracks(
  tracks: Track[],
  query: string,
  field: SearchField
): Track[] {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;

  return tracks.filter((track) => {
    const title = track.title.toLowerCase().includes(q);
    const artist = track.artist.toLowerCase().includes(q);
    const album = track.album.toLowerCase().includes(q);

    switch (field) {
      case "song":
        return title;
      case "artist":
        return artist;
      case "album":
        return album;
      default:
        return title || artist || album;
    }
  });
}

type SearchFilterProps = {
  query: string;
  onQueryChange: (query: string) => void;
  field: SearchField;
  onFieldChange: (field: SearchField) => void;
};

export function SearchFilter({
  query,
  onQueryChange,
  field,
  onFieldChange,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <SearchBox
        value={query}
        onChange={onQueryChange}
        placeholder={`Search by ${field === "all" ? "song, artist or album" : field}`}
      />

      <div className="flex flex-wrap gap-2">
        {fields.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={field === value ? "default" : "outline"}
            onClick={() => onFieldChange(value)}
            className={cn("rounded-full")}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
