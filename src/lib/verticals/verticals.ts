
export type VerticalId =
    | "MOTORING_PARKING"
    | "FLIGHT_DELAY"
    | "UTILITIES_COMPLAINT"
    | "TELECOMS_COMPLAINT"
    | "HOUSING_HMO"
    | "HOUSING_DISREPAIR";

export type VerticalDefinition = {
    id: VerticalId;
    label: string;
    description: string;
    visibility: "PUBLIC" | "HIDDEN";
};

export const VERTICALS: Record<VerticalId, VerticalDefinition> = {
    "MOTORING_PARKING": {
        id: "MOTORING_PARKING",
        label: "Motoring & Parking",
        description: "Penalty Charge Notices and Private Parking Charges",
        visibility: "PUBLIC"
    },
    "FLIGHT_DELAY": {
        id: "FLIGHT_DELAY",
        label: "Flight Delay Compensation",
        description: "Delays, cancellations and denied boarding under UK/EU261",
        visibility: "HIDDEN"
    },
    "UTILITIES_COMPLAINT": {
        id: "UTILITIES_COMPLAINT",
        label: "Energy & Water Complaints",
        description: "Billing disputes, service failures and ombudsman escalation",
        visibility: "HIDDEN"
    },
    "TELECOMS_COMPLAINT": {
        id: "TELECOMS_COMPLAINT",
        label: "Telecoms & Broadband",
        description: "Broadband speeds, contract disputes and billing issues",
        visibility: "HIDDEN"
    },
    "HOUSING_HMO": {
        id: "HOUSING_HMO",
        label: "Housing & RMO",
        description: "Rent repayment orders and landlord licensing disputes",
        visibility: "HIDDEN"
    },
    "HOUSING_DISREPAIR": {
        id: "HOUSING_DISREPAIR",
        label: "Housing Disrepair",
        description: "Damp, mold, and structural repair disputes",
        visibility: "HIDDEN"
    }
};

export function getDefaultVerticalId(): VerticalId {
    return "MOTORING_PARKING";
}

export function getPublicVerticals(): VerticalDefinition[] {
    return Object.values(VERTICALS).filter(v => v.visibility === "PUBLIC");
}

export function isVerticalEnabled(id: string): boolean {
    const v = VERTICALS[id as VerticalId];
    if (!v) return false;

    // Public is always enabled
    if (v.visibility === "PUBLIC") return true;

    // Check optional manual override via env (for dev testing)
    // In browser, process.env might be partial, but this is safe if key is missing.
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_ALL_VERTICALS === "true") {
        return true;
    }

    return false;
}
