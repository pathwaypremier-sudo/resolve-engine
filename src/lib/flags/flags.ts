
/**
 * Feature Flags module.
 * Centralizes all feature toggles.
 */

// Keys for environment variables
const ENV_Flag = {
    NOTEBOOKLM_PACK: "NEXT_PUBLIC_NOTEBOOKLM_ENABLED"
};

/**
 * Checks if a feature flag is enabled.
 * Defaults to false if not explicitly set to "true" or "1".
 */
export const flags = {
    notebookLM: {
        isEnabled: () => {
            if (typeof window !== 'undefined') {
                // Client-side access
                return process.env[ENV_Flag.NOTEBOOKLM_PACK] === "true" || process.env[ENV_Flag.NOTEBOOKLM_PACK] === "1";
            }
            // Server-side / fallback
            return process.env[ENV_Flag.NOTEBOOKLM_PACK] === "true" || process.env[ENV_Flag.NOTEBOOKLM_PACK] === "1";
        }
    }
};
