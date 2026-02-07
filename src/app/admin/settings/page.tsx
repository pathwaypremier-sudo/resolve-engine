import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/session.server';
import { getSetting } from '@/lib/ops/settings.server';
import SettingsForm from './SettingsForm';

/**
 * Admin Settings Page (Server Component)
 * 
 * Loads current settings and passes to client form.
 */

async function getCurrentUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) return null;
    const result = verifySessionToken(sessionCookie.value);
    if (!result.ok) return null;
    return result.actorId;
}

export default async function SettingsPage() {
    const userId = await getCurrentUserId();

    if (!userId) {
        return <div className="text-red-600">Session error. Please sign in again.</div>;
    }

    const [uploadsEnabled, maintenanceMode] = await Promise.all([
        getSetting('uploads_enabled'),
        getSetting('maintenance_mode')
    ]);

    return (
        <SettingsForm
            initialData={{
                uploadsEnabled: uploadsEnabled?.enabled !== false,
                maintenanceEnabled: maintenanceMode?.enabled === true,
                maintenanceMessage: maintenanceMode?.message,
                userId
            }}
        />
    );
}
