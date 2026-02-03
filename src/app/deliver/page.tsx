import { redirect } from "next/navigation";

export default function DeliverGatePage({ searchParams }: { searchParams: { case?: string; caseId?: string } }) {
    const caseId = searchParams.case || searchParams.caseId;

    if (caseId) {
        redirect(`/app/case/${caseId}/deliver`);
    } else {
        redirect("/app");
    }
}
