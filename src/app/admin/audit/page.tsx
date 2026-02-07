import { loadAdminAuditLogsWithActor } from '@/lib/db/repo.server';

/**
 * Admin Audit Log Page
 * 
 * Displays all admin actions with expandable metadata.
 */

export default async function AuditPage() {
    const logs = await loadAdminAuditLogsWithActor(100, 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
                <p className="text-gray-600 mt-1">All admin actions are recorded here</p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actor
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    IP
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User Agent
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No audit logs recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <AuditLogRow key={log.id} log={log} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

type AuditLog = Awaited<ReturnType<typeof loadAdminAuditLogsWithActor>>[number];

function AuditLogRow({ log }: { log: AuditLog }) {
    const userAgent = log.userAgent || '';
    const truncatedUA = userAgent.length > 40
        ? userAgent.substring(0, 40) + '...'
        : userAgent;

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
                {log.actorEmail || log.actorUserId.substring(0, 8) + '...'}
            </td>
            <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {log.action}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                {log.ip || '-'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500" title={userAgent}>
                {truncatedUA || '-'}
            </td>
            <td className="px-4 py-3">
                <MetadataExpander metadata={log.metadata} targetType={log.targetType} targetId={log.targetId} />
            </td>
        </tr>
    );
}

function MetadataExpander({
    metadata,
    targetType,
    targetId
}: {
    metadata: any;
    targetType: string | null;
    targetId: string | null;
}) {
    if (!metadata && !targetType) {
        return <span className="text-gray-400">-</span>;
    }

    return (
        <details className="cursor-pointer">
            <summary className="text-indigo-600 hover:text-indigo-800 text-sm">
                View details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono overflow-x-auto max-w-md">
                {targetType && (
                    <div className="mb-2">
                        <span className="text-gray-500">Target:</span>{' '}
                        <span className="text-gray-900">{targetType}</span>
                        {targetId && <span className="text-gray-500"> ({targetId})</span>}
                    </div>
                )}
                {metadata && (
                    <pre className="whitespace-pre-wrap text-gray-700">
                        {JSON.stringify(metadata, null, 2)}
                    </pre>
                )}
            </div>
        </details>
    );
}
