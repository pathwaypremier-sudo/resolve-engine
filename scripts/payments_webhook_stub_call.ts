async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: npm run ts-node scripts/payments_webhook_stub_call.ts <caseId> <checkoutId> <category>");
        console.error("Categories: PAID, FAILED, CANCELED");
        process.exit(1);
    }

    const [caseId, checkoutId, category] = args;
    const provider = "stub";
    const providerEventId = `sim_${Date.now()}`;

    const url = "http://localhost:3000/api/payments/webhook";
    const payload = {
        caseId,
        provider,
        checkoutId,
        providerEventId,
        category
    };

    console.log(`[Simulation] Pushing ${category} for case ${caseId}...`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Error] HTTP ${response.status}: ${errorText}`);
            process.exit(1);
        }

        const data = await response.json();
        console.log("[Success] Response:", JSON.stringify(data, null, 2));
    } catch (e: any) {
        if (e.code === "ECONNREFUSED" || e.message.includes("fetch failed")) {
            console.error("LOCALHOST_NOT_ACCESSIBLE");
        } else {
            console.error("[Fatal Error]", e.message);
        }
        process.exit(1);
    }
}

main();
