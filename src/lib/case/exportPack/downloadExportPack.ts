import { CaseExportPackV1 } from "./buildCaseExportPack";

export function downloadExportPack(pack: CaseExportPackV1) {
    const json = JSON.stringify(pack, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split("T")[0];
    const shortId = pack.caseId.slice(0, 8);
    const filename = `resolve_export_pack_${shortId}_${dateStr}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
