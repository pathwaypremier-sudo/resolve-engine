
import { VerticalId } from "./verticals";

export type FieldDefinition = {
    key: string;
    label: string;
    dataType: "string" | "date" | "money" | "boolean" | "enum";
    visibility: "PUBLIC" | "HIDDEN";
    notes?: string;
};

export type VerticalSchema = {
    verticalId: VerticalId;
    fields: FieldDefinition[];
};

export const VERTICAL_SCHEMAS: Record<VerticalId, VerticalSchema> = {
    "MOTORING_PARKING": {
        verticalId: "MOTORING_PARKING",
        fields: [
            { key: "issuer", label: "Issuer", dataType: "string", visibility: "PUBLIC" },
            { key: "reference", label: "Reference Number", dataType: "string", visibility: "PUBLIC" },
            { key: "notice_date", label: "Notice Date", dataType: "date", visibility: "PUBLIC" },
            { key: "event_date", label: "Event Date", dataType: "date", visibility: "PUBLIC" },
            { key: "summary", label: "Summary", dataType: "string", visibility: "PUBLIC" }
        ]
    },
    // Placeholders - Hidden
    "FLIGHT_DELAY": {
        verticalId: "FLIGHT_DELAY",
        fields: [
            { key: "flight_number", label: "Flight Number", dataType: "string", visibility: "HIDDEN" },
            { key: "airline", label: "Airline", dataType: "string", visibility: "HIDDEN" },
            { key: "departure_airport", label: "Departure Airport", dataType: "string", visibility: "HIDDEN" },
            { key: "arrival_airport", label: "Arrival Airport", dataType: "string", visibility: "HIDDEN" },
            { key: "scheduled_departure_date", label: "Scheduled Departure Date", dataType: "date", visibility: "HIDDEN" }
        ]
    },
    "UTILITIES_COMPLAINT": {
        verticalId: "UTILITIES_COMPLAINT",
        fields: [
            { key: "provider_name", label: "Provider Name", dataType: "string", visibility: "HIDDEN" },
            { key: "account_reference", label: "Account Number", dataType: "string", visibility: "HIDDEN" },
            { key: "service_address", label: "Service Address", dataType: "string", visibility: "HIDDEN" },
            { key: "bill_date", label: "Bill Date", dataType: "date", visibility: "HIDDEN" }
        ]
    },
    "TELECOMS_COMPLAINT": {
        verticalId: "TELECOMS_COMPLAINT",
        fields: [
            { key: "provider_name", label: "Provider Name", dataType: "string", visibility: "HIDDEN" },
            { key: "account_reference", label: "Account Number", dataType: "string", visibility: "HIDDEN" },
            { key: "contract_start_date", label: "Contract Start Date", dataType: "date", visibility: "HIDDEN" }
        ]
    },
    "HOUSING_HMO": {
        verticalId: "HOUSING_HMO",
        fields: [
            { key: "landlord_or_agent", label: "Landlord or Agent Name", dataType: "string", visibility: "HIDDEN" },
            { key: "property_postcode", label: "Property Postcode", dataType: "string", visibility: "HIDDEN" },
            { key: "issue_date", label: "Issue Date", dataType: "date", visibility: "HIDDEN" }
        ]
    },
    "HOUSING_DISREPAIR": {
        verticalId: "HOUSING_DISREPAIR",
        fields: [
            { key: "landlord_name", label: "Landlord Name", dataType: "string", visibility: "HIDDEN" },
            { key: "disrepair_type", label: "Type of Disrepair", dataType: "string", visibility: "HIDDEN" },
            { key: "notice_date", label: "Date Notice Given", dataType: "date", visibility: "HIDDEN" }
        ]
    }
};

export function getVerticalSchema(verticalId: VerticalId): VerticalSchema {
    return VERTICAL_SCHEMAS[verticalId];
}
