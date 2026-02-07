import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/session.server';
import { getUserById } from '@/lib/db/repo.server';

/**
 * Admin Layout
 * 
 * Server-side access control for all /admin routes.
 * Redirects non-admins to home page.
 */

async function getAdminUser() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
        return null;
    }

    const result = verifySessionToken(sessionCookie.value);
    if (!result.ok) {
        return null;
    }

    const user = await getUserById(result.actorId);
    if (!user || !user.isAdmin) {
        return null;
    }

    return user;
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getAdminUser();

    if (!user) {
        redirect('/?error=admin_required');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Admin Header */}
            <header className="bg-slate-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <a href="/" className="text-sm text-slate-400 hover:text-white">
                                ← Back to App
                            </a>
                            <h1 className="text-xl font-bold">Admin Console</h1>
                        </div>
                        <div className="text-sm text-slate-400">
                            Signed in as <span className="text-white font-medium">{user.email}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Admin Navigation */}
            <nav className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1">
                        <NavLink href="/admin">Dashboard</NavLink>
                        <NavLink href="/admin/settings">Settings</NavLink>
                        <NavLink href="/admin/audit">Audit Log</NavLink>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            className="px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
            {children}
        </a>
    );
}
