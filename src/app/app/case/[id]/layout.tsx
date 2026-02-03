import type { ReactNode } from "react";
import { CaseProvider } from "../_context/CaseContext";
import { EntitlementProvider } from "../_context/EntitlementContext";

type Props = {
    params: { id: string };
    children: ReactNode;
};

export default function CaseLayout({ params, children }: Props) {
    return (
        <CaseProvider caseId={params.id}>
            <EntitlementProvider>{children}</EntitlementProvider>
        </CaseProvider>
    );
}
