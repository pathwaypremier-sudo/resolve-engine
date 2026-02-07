import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/session.server';
import { getUserById, loadAdminAuditLogsWithActor, countAdmins } from '@/lib/db/repo.server';
import { getSetting } from '@/lib/ops/settings.server';
import { pool } from '@/lib/db/pool.server';

/**
 * Admin Dashboard
 * 
 * Shows system status overview and recent admin activity.
 */

async function getStats() {
    const [usersResult, casesResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM cases')
    ]);

    return {
        totalUsers: parseInt(usersResult.rows[0].count, 10),
        totalCases: parseInt(casesResult.rows[0].count, 10),
        totalAdmins: await countAdmins()
    };
}

async function getCurrentUserId() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) return null;
    const result = verifySessionToken(sessionCookie.value);
    if (!result.ok) return null;
    return result.actorId;
}

export default async function AdminDashboard() {
    const [uploadsEnabled, maintenanceMode, recentLogs, stats] = await Promise.all([
        getSetting('uploads_enabled'),
        getSetting('maintenance_mode'),
        loadAdminAuditLogsWithActor(10, 0),
        getStats()
    ]);

    const uploadsStatus = uploadsEnabled?.enabled !== false;
    const maintenanceStatus = maintenanceMode?.enabled === true;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-600 mt-1">System overview and status</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatusCard
                    title="Uploads"
                    value={uploadsStatus ? 'Enabled' : 'Disabled'}
                    status={uploadsStatus ? 'success' : 'warning'}
                />
                <StatusCard
                    title="Maintenance Mode"
                    value={maintenanceStatus ? 'Active' : 'Off'}
                    status={maintenanceStatus ? 'warning' : 'success'}
                />
                <StatusCard
                    title="Total Users"
                    value={stats.totalUsers.toString()}
                    status="info"
                />
                <StatusCard
                    title="Active Cases"
                    value={stats.totalCases.toString()}
                    status="info"
                />
            </div>

            {/* Admin Count */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Accounts</h3>
                <p className="text-3xl font-bold text-indigo-600">{stats.totalAdmins}</p>
                <p className="text-sm text-gray-500 mt-1">active admin users</p>
            </div>

            {/* Recent Admin Activity */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Admin Activity</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {recentLogs.length === 0 ? (
                        <p className="px-6 py-4 text-gray-500 text-sm">No admin activity recorded yet.</p>
                    ) : (
                        recentLogs.map(log => (
                            <div key={log.id} className="px-6 py-3 flex items-center justify-between">
                                <div>
                                    <span className="font-medium text-gray-900">{log.action}</span>
                                    <span className="text-gray-500 text-sm ml-2">
                                        by {log.actorEmail || 'Unknown'}
                                    </span>
                                </div>
                                <span className="text-gray-400 text-sm">
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
                {recentLogs.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-200">
                        <a href="/admin/audit" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                            View all activity →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusCard({
    title,
    value,
    status
}: {
    title: string;
    value: string;
    status: 'success' | 'warning' | 'error' | 'info';
}) {
    const colors = {
        success: 'bg-green-50 border-green-200 text-green-700',
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
        error: 'bg-red-50 border-red-200 text-red-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700'
    };

    return (
        <div className={`rounded-lg border-2 p-4 ${colors[status]}`}>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
    );
}
