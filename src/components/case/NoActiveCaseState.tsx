import EmptyState from "@/components/ui/EmptyState";
import { FolderOpen } from "lucide-react";

export default function NoActiveCaseState() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
            <div className="w-full max-w-lg">
                <EmptyState
                    title="No case selected"
                    body="This area requires an active case. Select a case or create a new one to continue."
                    icon={FolderOpen}
                    primaryAction={{
                        label: "Go to cases",
                        href: "/app",
                    }}
                />
            </div>
        </div>
    );
}
