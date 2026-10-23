// landingPage/search-box.tsx
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBoxProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
};

export function SearchBox({
    value,
    onChange,
    placeholder = "Search...",
    className,
}: SearchBoxProps) {
    return (
        <div className={cn("relative w-full", className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />

            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
