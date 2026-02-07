"use client";

import { useState, useTransition } from 'react';
import { updateUploadsSetting, updateMaintenanceMode } from '@/app/actions/adminActions';

/**
 * Admin Settings Page (Client Component)
 * 
 * Toggles for uploads and maintenance mode.
 */

type SettingsData = {
    uploadsEnabled: boolean;
    maintenanceEnabled: boolean;
    maintenanceMessage?: string;
    userId: string;
};

export default function SettingsForm({
    initialData
}: {
    initialData: SettingsData;
}) {
    const [uploadsEnabled, setUploadsEnabled] = useState(initialData.uploadsEnabled);
    const [maintenanceEnabled, setMaintenanceEnabled] = useState(initialData.maintenanceEnabled);
    const [maintenanceMessage, setMaintenanceMessage] = useState(initialData.maintenanceMessage || '');
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleUploadsToggle = () => {
        const newValue = !uploadsEnabled;
        setUploadsEnabled(newValue);
        setMessage(null);

        startTransition(async () => {
            const result = await updateUploadsSetting(newValue, initialData.userId);
            if (result.ok) {
                setMessage({ type: 'success', text: result.message || 'Updated' });
            } else {
                setUploadsEnabled(!newValue); // Revert
                setMessage({ type: 'error', text: result.error });
            }
        });
    };

    const handleMaintenanceToggle = () => {
        const newValue = !maintenanceEnabled;
        setMaintenanceEnabled(newValue);
        setMessage(null);

        startTransition(async () => {
            const result = await updateMaintenanceMode(
                newValue,
                newValue ? maintenanceMessage : undefined,
                initialData.userId
            );
            if (result.ok) {
                setMessage({ type: 'success', text: result.message || 'Updated' });
            } else {
                setMaintenanceEnabled(!newValue); // Revert
                setMessage({ type: 'error', text: result.error });
            }
        });
    };

    const handleMessageUpdate = () => {
        if (!maintenanceEnabled) return;
        setMessage(null);

        startTransition(async () => {
            const result = await updateMaintenanceMode(true, maintenanceMessage, initialData.userId);
            if (result.ok) {
                setMessage({ type: 'success', text: 'Message updated' });
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-600 mt-1">Manage application operational settings</p>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Uploads Toggle */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">File Uploads</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            Control whether users can upload evidence documents
                        </p>
                    </div>
                    <ToggleSwitch
                        enabled={uploadsEnabled}
                        onChange={handleUploadsToggle}
                        disabled={isPending}
                        label={uploadsEnabled ? 'Enabled' : 'Disabled'}
                    />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <StatusBadge
                        status={uploadsEnabled ? 'active' : 'inactive'}
                        text={uploadsEnabled ? 'Uploads are active' : 'Uploads are blocked'}
                    />
                </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Maintenance Mode</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            Block all write operations (uploads, submissions, edits)
                        </p>
                    </div>
                    <ToggleSwitch
                        enabled={maintenanceEnabled}
                        onChange={handleMaintenanceToggle}
                        disabled={isPending}
                        label={maintenanceEnabled ? 'Active' : 'Off'}
                    />
                </div>

                {/* Maintenance Message */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maintenance Message (shown to users)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={maintenanceMessage}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            placeholder="System upgrade in progress..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled={isPending}
                        />
                        <button
                            onClick={handleMessageUpdate}
                            disabled={isPending || !maintenanceEnabled}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Update
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <StatusBadge
                        status={maintenanceEnabled ? 'warning' : 'active'}
                        text={maintenanceEnabled ? 'Write operations blocked' : 'System operating normally'}
                    />
                </div>
            </div>

            {/* Warning */}
            {maintenanceEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                        <span className="text-amber-500 text-xl">⚠️</span>
                        <div>
                            <p className="font-medium text-amber-800">Maintenance Mode Active</p>
                            <p className="text-amber-700 text-sm mt-1">
                                Users cannot perform any write operations. Admin routes remain accessible.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ToggleSwitch({
    enabled,
    onChange,
    disabled,
    label
}: {
    enabled: boolean;
    onChange: () => void;
    disabled: boolean;
    label: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
                {label}
            </span>
            <button
                type="button"
                onClick={onChange}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}

function StatusBadge({ status, text }: { status: 'active' | 'inactive' | 'warning'; text: string }) {
    const colors = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-700',
        warning: 'bg-amber-100 text-amber-700'
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${status === 'active' ? 'bg-green-500' :
                    status === 'warning' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
            {text}
        </span>
    );
}
