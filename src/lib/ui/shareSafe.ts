"use client";

import { useState, useEffect } from "react";

const SHARE_SAFE_KEY = "re_share_safe";

/**
 * Global Share-Safe State Hook
 * Synchronizes redaction preference across components via localStorage and event listeners.
 */
export function useShareSafe() {
    // Default to false (raw view)
    const [isRedacted, setIsRedactedState] = useState(false);

    useEffect(() => {
        // Load initial state
        const stored = localStorage.getItem(SHARE_SAFE_KEY);
        if (stored === "1") {
            setIsRedactedState(true);
        }

        // Listen for storage changes (cross-tab) or custom events (same-tab)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === SHARE_SAFE_KEY) {
                setIsRedactedState(e.newValue === "1");
            }
        };

        const handleCustom = () => {
            const val = localStorage.getItem(SHARE_SAFE_KEY);
            setIsRedactedState(val === "1");
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener("share-safe-change", handleCustom);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("share-safe-change", handleCustom);
        };
    }, []);

    const setIsRedacted = (value: boolean) => {
        setIsRedactedState(value);
        localStorage.setItem(SHARE_SAFE_KEY, value ? "1" : "0");
        // Dispatch custom event for same-tab sync
        window.dispatchEvent(new Event("share-safe-change"));
    };

    return { isRedacted, setIsRedacted };
}
