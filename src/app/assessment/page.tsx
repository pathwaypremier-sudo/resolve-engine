import { redirect } from "next/navigation";

export default function AssessmentGatePage({ searchParams }: { searchParams: { case?: string; caseId?: string } }) {
    const caseId = searchParams.case || searchParams.caseId;

    if (caseId) {
        redirect(`/app/case/${caseId}/assessment`);
    } else {
        redirect("/app");
    }
}
