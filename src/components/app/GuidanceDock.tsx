interface GuidanceDockProps {
    title?: string;
    whatThisPageDoes?: string[];
    whatToPrepare?: string[];
    whatHappensNext?: string[];
}

export default function GuidanceDock({
    title = "Guidance",
    whatThisPageDoes = [],
    whatToPrepare = [],
    whatHappensNext = [],
}: GuidanceDockProps) {
    const hasDoes = whatThisPageDoes.length > 0;
    const hasPrepare = whatToPrepare.length > 0;
    const hasNext = whatHappensNext.length > 0;

    if (!hasDoes && !hasPrepare && !hasNext) {
        return null;
    }

    return (
        <aside className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h4 className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-4">
                {title}
            </h4>

            <div className="space-y-4">
                {hasDoes && (
                    <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-medium">
                            What this page does
                        </p>
                        <ul className="space-y-1">
                            {whatThisPageDoes.map((item, i) => (
                                <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                                    <span className="text-zinc-300 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {hasPrepare && (
                    <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-medium">
                            What to prepare
                        </p>
                        <ul className="space-y-1">
                            {whatToPrepare.map((item, i) => (
                                <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                                    <span className="text-zinc-300 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {hasNext && (
                    <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-medium">
                            What happens next
                        </p>
                        <ul className="space-y-1">
                            {whatHappensNext.map((item, i) => (
                                <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                                    <span className="text-zinc-300 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100">
                <p className="text-[10px] text-zinc-400">Procedural guidance.</p>
            </div>
        </aside>
    );
}
