/**
 * Global list of banned phrases that must not appear in any generated artifact.
 * Used by verify:artifacts (or equivalent checks).
 * 
 * Centralized policy to ensure no legacy or debug warnings leak into user artifacts.
 */
export const BANNED_PHRASES = [
    "Legacy Timeline Facts Warning"
] as const;
