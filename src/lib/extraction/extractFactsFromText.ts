import {
    VRN_REGEX, DATE_REGEX, MONEY_REGEX, PCN_LABELS,
    ISSUER_KEYWORDS, NOTICE_TYPE_MATCHES, LOCATION_LABELS,
    CONTRAVENTION_CODE_REGEX, DISCOUNT_REGEX,
    TIME_REGEX, TIME_LABELS, normalizeTime,
    normalizeVRN, isValidVRN
} from "./patterns";

export type Confidence = "high" | "med" | "low";

export type ExtractedField = {
    value: string;
    confidence: Confidence;
    source: "document_text";
    sourceType?: "NATIVE" | "OCR";
    evidence?: string; // Snippet
};

export type ExtractedFacts = {
    vrn?: ExtractedField;
    pcnRef?: ExtractedField;
    eventDate?: ExtractedField;
    issueDate?: ExtractedField;
    amountDue?: ExtractedField;
    // Extended fields
    issuerName?: ExtractedField;
    noticeType?: ExtractedField;
    location?: ExtractedField;
    issueTime?: ExtractedField;  // Time of issue (HH:MM format)
    discountAmount?: ExtractedField;
    contraventionCode?: ExtractedField;
    vehicleMakeModel?: ExtractedField;

    rawMentions?: string[];
};

function getSnippet(text: string, index: number, length: number): string {
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + length + 20);
    return "..." + text.substring(start, end).replace(/\n/g, " ") + "...";
}

export function extractFactsFromText(text: string): ExtractedFacts {
    const findings: ExtractedFacts = {};
    const lines = text.split(/\r?\n/);

    // 1. VRN Extraction
    const uniqueVrns = new Set<string>();
    const vrnMatches = [...text.matchAll(VRN_REGEX)];

    for (const m of vrnMatches) {
        const raw = m[0];
        if (isValidVRN(raw)) {
            const norm = normalizeVRN(raw);
            uniqueVrns.add(norm);
            if (!findings.vrn) {
                findings.vrn = {
                    value: norm,
                    confidence: "high",
                    source: "document_text",
                    evidence: getSnippet(text, m.index!, raw.length),
                };
            }
        }
    }

    // 2. PCN Reference (Label + Value)
    for (const label of PCN_LABELS) {
        const regex = new RegExp(`${label}[:\\.\\-]?\\s+([A-Z0-9]{6,12})`, "i");
        const match = text.match(regex);
        if (match && match[1]) {
            findings.pcnRef = {
                value: match[1].toUpperCase(),
                confidence: "high",
                source: "document_text",
                evidence: getSnippet(text, match.index!, match[0].length),
            };
            break;
        }
    }

    // 3. Dates
    const dateMatches = [...text.matchAll(DATE_REGEX)];
    if (dateMatches.length > 0) {
        for (const m of dateMatches) {
            const val = m[0];
            const idx = m.index!;
            const context = text.substring(Math.max(0, idx - 40), idx).toLowerCase();

            if (context.includes("contravention") || context.includes("offence") || context.includes("breach")) {
                if (!findings.eventDate) {
                    findings.eventDate = {
                        value: val,
                        confidence: "high",
                        source: "document_text",
                        evidence: getSnippet(text, idx, val.length),
                    };
                }
            } else if (context.includes("issue") || context.includes("notice") || context.includes("date of")) {
                if (!findings.issueDate) {
                    findings.issueDate = {
                        value: val,
                        confidence: "high",
                        source: "document_text",
                        evidence: getSnippet(text, idx, val.length),
                    };
                }
            }
        }

        // Fallback: if we have dates but no specific assignment
        if (!findings.eventDate && dateMatches[0]) {
            findings.eventDate = {
                value: dateMatches[0][0],
                confidence: "low",
                source: "document_text",
                evidence: getSnippet(text, dateMatches[0].index!, dateMatches[0][0].length),
            };
        }
    }

    // 4. Money
    const moneyMatches = [...text.matchAll(MONEY_REGEX)];
    if (moneyMatches.length > 0) {
        // Simple logic: Largest amount implies Penalty? Or first?
        // Let's take first as Amount Due for now.
        findings.amountDue = {
            value: moneyMatches[0][0], // "£100"
            confidence: "med",
            source: "document_text",
            evidence: getSnippet(text, moneyMatches[0].index!, moneyMatches[0][0].length),
        };
    }

    // 5. Issuer logic
    // We scan lines for strong issuer keywords.
    // Heuristic: First line with "Council" or "Borough" or "Limited" that isn't just noise
    for (const line of lines) {
        if (ISSUER_KEYWORDS.some(k => line.includes(k))) {
            if (line.length < 60) { // Avoid long paragraphs
                // Trim noise
                const cleaned = line.trim();
                if (!findings.issuerName) {
                    findings.issuerName = {
                        value: cleaned,
                        confidence: "med",
                        source: "document_text",
                        evidence: cleaned
                    };
                }
                break; // Take first strong hit
            }
        }
    }

    // 6. Notice Type
    for (const type of NOTICE_TYPE_MATCHES) {
        if (text.toLowerCase().includes(type.toLowerCase())) {
            findings.noticeType = {
                value: type,
                confidence: "high",
                source: "document_text",
                evidence: type
            };
            break;
        }
    }

    // 7. Location
    for (const label of LOCATION_LABELS) {
        // Look for Label: Value
        // Allow some flexibility in separator
        const regex = new RegExp(`${label}\\s*[:\\.]?\\s*([^\\n]+)`, "i");
        const match = text.match(regex);
        if (match && match[1]) {
            const locVal = match[1].trim();
            if (locVal.length > 3 && locVal.length < 80) {
                findings.location = {
                    value: locVal,
                    confidence: "med",
                    source: "document_text",
                    evidence: getSnippet(text, match.index!, match[0].length)
                };
                break;
            }
        }
    }

    // 8. Time of Issue
    // Look for time patterns near time-related keywords
    const lowerText = text.toLowerCase();
    for (const label of TIME_LABELS) {
        const labelIdx = lowerText.indexOf(label);
        if (labelIdx !== -1) {
            // Search in a window after the label (up to 30 chars)
            const searchStart = labelIdx + label.length;
            const searchEnd = Math.min(searchStart + 30, text.length);
            const window = text.substring(searchStart, searchEnd);

            // Try to find a time in this window
            const timeMatch = window.match(TIME_REGEX);
            if (timeMatch) {
                const rawTime = timeMatch[0];
                const normalizedTime = normalizeTime(rawTime);
                if (normalizedTime && !findings.issueTime) {
                    findings.issueTime = {
                        value: normalizedTime,
                        confidence: "high",
                        source: "document_text",
                        evidence: getSnippet(text, labelIdx, label.length + rawTime.length + 10)
                    };
                    break;
                }
            }
        }
    }

    // Fallback: if no labeled time found, look for standalone time patterns
    // near date patterns (common in "Date/Time: 01/02/2026 14:35" format)
    if (!findings.issueTime) {
        const timeMatches = [...text.matchAll(TIME_REGEX)];
        for (const m of timeMatches) {
            const idx = m.index!;
            // Check if this is near a date (within 20 chars)
            const context = text.substring(Math.max(0, idx - 25), idx + 10).toLowerCase();
            if (context.includes("date") || context.includes("issue") || context.includes("time")) {
                const normalizedTime = normalizeTime(m[0]);
                if (normalizedTime) {
                    findings.issueTime = {
                        value: normalizedTime,
                        confidence: "med",
                        source: "document_text",
                        evidence: getSnippet(text, idx, m[0].length)
                    };
                    break;
                }
            }
        }
    }

    // 9. Contravention Code
    const codeMatch = text.match(CONTRAVENTION_CODE_REGEX);
    if (codeMatch && codeMatch[2]) {
        findings.contraventionCode = {
            value: codeMatch[2],
            confidence: "high",
            source: "document_text",
            evidence: getSnippet(text, codeMatch.index!, codeMatch[0].length)
        };
    }

    // 9. Discount
    const discMatch = text.match(DISCOUNT_REGEX);
    if (discMatch && discMatch[1]) {
        findings.discountAmount = {
            value: discMatch[1],
            confidence: "high",
            source: "document_text",
            evidence: getSnippet(text, discMatch.index!, discMatch[0].length)
        };
    }

    return findings;
}
