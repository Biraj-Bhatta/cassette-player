// settings/player-settings.tsx
import { useState } from "react";
import { PLAYER } from "@/config/app-config";
import { savePlayerConfig } from "@/lib/config-store";
import { toast } from "@/lib/toast";

export default function PlayerSettings() {
    const [seek, setSeek] = useState(PLAYER.seekSeconds);
    const [step, setStep] = useState(PLAYER.volumeStep);

    const save = (next: { seekSeconds: number; volumeStep: number }) => {
        savePlayerConfig(next).catch((err) => toast.error(`Couldn't save: ${err}`));
    };

    return (
        <div className="space-y-6">
            <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Seek amount (Left / Right arrows)</span>
                    <span className="tabular-nums">{seek} s</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={60}
                    step={1}
                    value={seek}
                    onChange={(e) => setSeek(Number(e.target.value))}
                    onPointerUp={() => save({ seekSeconds: seek, volumeStep: step })}
                    onKeyUp={() => save({ seekSeconds: seek, volumeStep: step })}
                    className="w-full accent-black"
                />
            </label>

            <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Volume step (mouse wheel over the player)</span>
                    <span className="tabular-nums">{Math.round(step * 100)}%</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={Math.round(step * 100)}
                    onChange={(e) => setStep(Number(e.target.value) / 100)}
                    onPointerUp={() => save({ seekSeconds: seek, volumeStep: step })}
                    onKeyUp={() => save({ seekSeconds: seek, volumeStep: step })}
                    className="w-full accent-black"
                />
            </label>
        </div>
    );
}
