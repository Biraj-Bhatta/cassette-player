// common/scan-button.tsx
import { Disc3, FolderOpen } from "lucide-react";
import { PickFolder, ScanFolder } from "@wails/go/main/App";
import { toast } from "@/lib/toast";
import { useScanState } from "@/lib/scan-state";

export default function ScanButton() {
    const { status, count, error } = useScanState();

    async function handleScan() {
        try {
            const dir = await PickFolder();
            if (!dir) return;
            await ScanFolder(dir);
        } catch (err) {
            console.error("Scan failed:", err);
            toast.error(`Scan failed: ${err}`);
        }
    }

    if (status === "scanning") {
        return (
            <div className="flex h-9 items-center gap-2 text-white rounded-lg bg-forest-green px-3">
                <Disc3 className="h-5 w-5 animate-spin" />
                <span className="text-sm tabular-nums">{count}</span>
            </div>
        );
    }

    if (status === "error") {
        return (
            <button
                type="button"
                onClick={handleScan}
                title={error}
                aria-label="Scan failed, retry"
                className="flex h-8 w-8 items-center justify-center rounded border border-red-500 bg-red-500 text-white"
            >
                !
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleScan}
            className="w-fit h-14 flex gap-2 rounded-lg border text-white bg-forest-green px-3 py-1 items-center justify-center"
        >
            <FolderOpen/>
            {status === "done" ? `${count} tracks` : "Scan"}
        </button>
    );
}
