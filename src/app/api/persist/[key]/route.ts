
import { NextRequest, NextResponse } from "next/server";
import { sqliteDb } from "@/lib/persistence/sqliteDb";

type Params = {
    params: { key: string }
};

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const row = sqliteDb.get(params.key);

        if (!row) {
            return NextResponse.json({ error: "Key not found" }, { status: 404 });
        }

        return NextResponse.json({ value: row.value, updatedAt: row.updated_at });
    } catch (e) {
        console.error("[API] GET error", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: Params) {
    try {
        const body = await req.json();
        // Allow raw value or { value: ... }
        const val = body.value !== undefined ? body.value : body;
        const stringVal = String(val);

        // Validation limits
        if (params.key.length > 200) {
            return NextResponse.json({ error: "Key too long" }, { status: 400 });
        }
        if (stringVal.length > 1024 * 1024) { // 1MB limit
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        sqliteDb.set(params.key, stringVal);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[API] PUT error", e);
        return NextResponse.json({ success: false }, { status: 500 }); // 500 or 400 depending on parse error
    }
}

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        sqliteDb.del(params.key);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[API] DELETE error", e);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
