
import {
    Download,
    Headphones,
    Music2,
    Sparkles,
} from "lucide-react";

export default function DownloadsPage() {
    return (
        <main className="relative flex min-h-full flex-col overflow-hidden rounded-2xl bg-backgroundWhite p-6 text-charcoal">
            {/* Header */}
            <header className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl border border-forest/10 bg-forest/10">
                    <Download className="size-5 text-forest" />
                </div>

                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Downloads
                    </h1>
                    <p className="text-sm text-charcoal/60">
                        Your offline music library
                    </p>
                </div>
            </header>

            {/* Empty state */}
            <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-14 text-center">
                {/* Music illustration */}
                <div className="relative mb-8 flex size-36 items-center justify-center rounded-full border border-forest/10 bg-forest/5">
                    <div className="flex size-24 items-center justify-center rounded-full border border-forest/10 bg-forest">
                        <Music2 className="size-11 text-backgroundWhite" />
                    </div>

                    <div className="absolute bottom-1 right-0 flex size-12 items-center justify-center rounded-2xl border border-white/70 bg-caramel shadow-sm">
                        <Download className="size-5 text-charcoal" />
                    </div>

                    <div className="absolute left-3 top-5 size-2 rounded-full bg-caramel" />
                    <div className="absolute right-2 top-7 size-1.5 rounded-full bg-forest/40" />
                </div>

                {/* Status */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-forest/10 bg-forest/5 px-3 py-1.5 text-xs font-medium text-forest">
                    <Sparkles className="size-3.5" />
                    Coming in a future update
                </div>

                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Your music, offline.
                </h2>

                <p className="mt-3 max-w-sm text-sm leading-6 text-charcoal/65">
                    Downloads aren't available just yet. We're working
                    on bringing offline listening to your music library
                    in a future update.
                </p>

                {/* Supporting information */}
                <div className="mt-8 flex w-full max-w-sm items-start gap-3 rounded-xl border border-charcoal/10 bg-white/40 p-4 text-left">
                    <Headphones className="mt-0.5 size-5 shrink-0 text-forest" />

                    <div>
                        <p className="text-sm font-medium">
                            Your library is still here
                        </p>
                        <p className="mt-1 text-xs leading-5 text-charcoal/60">
                            Keep listening to your locally available music
                            while we prepare offline downloads.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}

