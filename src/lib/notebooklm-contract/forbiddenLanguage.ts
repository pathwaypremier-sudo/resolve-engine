/**
 * NotebookLM Contract v1 — Forbidden Language
 *
 * Centralized list of phrases and patterns that must NEVER appear in
 * NotebookLM-generated output. Phase N2 will wire runtime scanning;
 * this file defines the constants and a detection helper.
 *
 * Philosophy: conservative — block anything that could be read as a
 * guarantee, threat, or outcome promise. Ethics over persuasion.
 */

// ─── Forbidden Phrases ──────────────────────────────────────────────
// Exact substrings (case-insensitive matching). Keep alphabetically sorted.

export const FORBIDDEN_PHRASES: readonly string[] = [
    "assured outcome",
    "certain to succeed",
    "certainly win",
    "final chance",
    "final warning",
    "guaranteed",
    "guaranteed outcome",
    "guaranteed result",
    "guaranteed success",
    "ignore this and",
    "last warning",
    "must cancel",
    "must pay",
    "this is illegal",
    "we guarantee",
    "we promise",
    "will definitely",
    "will win",
    "you are entitled to cancel",
    "you will succeed",
    "you will win",
] as const;

// ─── Forbidden Patterns ─────────────────────────────────────────────
// Regex pattern strings for more nuanced matching.

export const FORBIDDEN_PATTERN_STRINGS: readonly string[] = [
    // Promise / guarantee language
    "\\b(guarantee[ds]?|assured|certain to)\\b",
    // Threat language
    "\\b(final\\s+(chance|warning|notice)|last\\s+warning|legal\\s+action\\s+will)\\b",
    // Outcome certainty
    "\\b(you\\s+will\\s+(definitely|certainly|surely)\\s+(win|succeed))\\b",
    // Illegality assertions (stating something IS illegal, vs explaining the law)
    "\\b(this\\s+is\\s+illegal|they\\s+have\\s+broken\\s+the\\s+law)\\b",
    // Coercive payment language
    "\\b(must\\s+(pay|cancel)|have\\s+no\\s+choice)\\b",
] as const;

// ─── Compiled Regexes ───────────────────────────────────────────────

let _compiledPatterns: RegExp[] | null = null;

/** Returns compiled RegExp[] from FORBIDDEN_PATTERN_STRINGS (cached). */
export function getForbiddenPhraseRegexes(): RegExp[] {
    if (!_compiledPatterns) {
        _compiledPatterns = FORBIDDEN_PATTERN_STRINGS.map(
            (p) => new RegExp(p, "gi")
        );
    }
    // Reset lastIndex on each call to avoid stale state from global flag
    for (const r of _compiledPatterns) r.lastIndex = 0;
    return _compiledPatterns;
}

// ─── Detection Helper ───────────────────────────────────────────────

export type ForbiddenLanguageResult = {
    hit: boolean;
    matches: string[];
};

/**
 * Scans `text` for any forbidden language.
 * Returns `{ hit: true, matches: [...] }` if any match is found.
 */
export function containsForbiddenLanguage(
    text: string
): ForbiddenLanguageResult {
    const lower = text.toLowerCase();
    const matches: string[] = [];

    // 1. Check exact phrases
    for (const phrase of FORBIDDEN_PHRASES) {
        if (lower.includes(phrase.toLowerCase())) {
            matches.push(`phrase: "${phrase}"`);
        }
    }

    // 2. Check regex patterns
    const regexes = getForbiddenPhraseRegexes();
    for (let i = 0; i < regexes.length; i++) {
        const re = regexes[i];
        re.lastIndex = 0;
        const match = re.exec(text);
        if (match) {
            matches.push(`pattern: "${FORBIDDEN_PATTERN_STRINGS[i]}" matched "${match[0]}"`);
        }
    }

    return {
        hit: matches.length > 0,
        matches,
    };
}
