import { BANNED_PHRASES } from "./bannedPhrases";

/**
 * Asserts that the generated text does not contain any banned phrases.
 * This is a development-time safety check and is disabled in production.
 */
export function assertNoBannedPhrases(text: string): void {
    if (process.env.NODE_ENV === "production") {
        return;
    }

    for (const phrase of BANNED_PHRASES) {
        if (text.includes(phrase)) {
            throw new Error(`Generated artifact contains banned phrase: "${phrase}"`);
        }
    }
}
