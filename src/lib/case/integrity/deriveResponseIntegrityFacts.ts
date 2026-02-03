import { readCaseEvents } from "@/lib/case/events";

export type ResponseIntegrityFacts = {
    hasResponse: boolean;
    hasAnyFormat: boolean;
    hasAnyMethod: boolean;
    identifiers: {
        hasReference: boolean;
        hasDate: boolean;
        hasVehicleReg: boolean;
        hasLinkedDoc: boolean;
    };
    allResponsesComplete: boolean;
};

export function deriveResponseIntegrityFacts(caseId: string): ResponseIntegrityFacts {
    if (typeof window === "undefined") {
        return {
            hasResponse: false,
            hasAnyFormat: false,
            hasAnyMethod: false,
            identifiers: {
                hasReference: false,
                hasDate: false,
                hasVehicleReg: false,
                hasLinkedDoc: false,
            },
            allResponsesComplete: false,
        };
    }

    const events = readCaseEvents(caseId);
    const responseEvents = events.filter(
        (e: any) => e.type === "RESPONSE_RECEIVED" || e.type === "APPEAL_REJECTED_PRE_COURT"
    );

    if (responseEvents.length === 0) {
        return {
            hasResponse: false,
            hasAnyFormat: false,
            hasAnyMethod: false,
            identifiers: {
                hasReference: false,
                hasDate: false,
                hasVehicleReg: false,
                hasLinkedDoc: false,
            },
            allResponsesComplete: false,
        };
    }

    let hasAnyFormat = false;
    let hasAnyMethod = false;

    let hasReference = false;
    let hasDate = false;
    let hasVehicleReg = false;
    let hasLinkedDoc = false;

    let allResponsesComplete = true;

    for (const event of responseEvents) {
        const meta = (event as any).meta || {};

        const hasFormat = !!meta.response_type || !!meta.outcome;
        const hasMethod = !!meta.method || !!meta.via;

        const thisHasReference = !!meta.reference;
        const thisHasDate = !!meta.date;
        const thisHasVehicleReg = !!meta.vehicle_reg || !!meta.vrm;
        const thisHasLinkedDoc = !!meta.linked_doc_name || !!meta.linked_doc_id;

        if (hasFormat) hasAnyFormat = true;
        if (hasMethod) hasAnyMethod = true;

        if (thisHasReference) hasReference = true;
        if (thisHasDate) hasDate = true;
        if (thisHasVehicleReg) hasVehicleReg = true;
        if (thisHasLinkedDoc) hasLinkedDoc = true;

        const thisHasAnyIdentifier =
            thisHasReference || thisHasDate || thisHasVehicleReg || thisHasLinkedDoc;

        if (!hasFormat || !hasMethod || !thisHasAnyIdentifier) {
            allResponsesComplete = false;
        }
    }

    return {
        hasResponse: true,
        hasAnyFormat,
        hasAnyMethod,
        identifiers: {
            hasReference,
            hasDate,
            hasVehicleReg,
            hasLinkedDoc,
        },
        allResponsesComplete,
    };
}
