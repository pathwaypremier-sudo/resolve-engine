interface GuidanceRailProps {
    records?: string[];
    derives?: string[];
    exports?: string[];
}

export default function GuidanceRail({ records = [], derives = [], exports: exportsList = [] }: GuidanceRailProps) {
    const hasRecords = records.length > 0;
    const hasDerives = derives.length > 0;
    const hasExports = exportsList.length > 0;

    if (!hasRecords && !hasDerives && !hasExports) {
        return null;
    }

    return (
        <div className="rounded-lg border border-zinc-100 bg-white p-4 space-y-4 shadow-sm">
            {hasRecords && (
                <div className="space-y-2">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
                        This page records
                    </p>
                    <ul className="space-y-1">
                        {records.map((item, i) => (
                            <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                                <span className="text-zinc-300 mt-1">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {hasDerives && (
                <div className="space-y-2">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
                        This page derives
                    </p>
                    <ul className="space-y-1">
                        {derives.map((item, i) => (
                            <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                                <span className="text-zinc-300 mt-1">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {hasExports && (
                <div className="space-y-2">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
                        Available exports
                    </p>
                    <ul className="space-y-1">
                        {exportsList.map((item, i) => (
                            <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                                <span className="text-zinc-300 mt-1">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="pt-3 border-t border-zinc-100">
                <p className="text-[10px] text-zinc-400">Reference only.</p>
            </div>
        </div>
    );
}
