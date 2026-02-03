"use client";

import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";

export default function AssessmentOverviewPanel() {
    return (
        <Panel className="bg-muted/50">
            <PanelHeader title="Assessment overview" />
            <PanelBody>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    This page records facts relevant to the assessment of this case. Entries here are based on the information currently recorded and any documents provided. No advice or outcomes are implied.
                </p>
            </PanelBody>
        </Panel>
    );
}
