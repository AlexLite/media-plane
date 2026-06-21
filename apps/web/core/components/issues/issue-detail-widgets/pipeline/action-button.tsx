import React, { useMemo, useState } from "react";
import { Workflow } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { IssueService } from "@/services/issue";
import { ISSUE_PIPELINE_UPDATED } from "./events";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export function PipelineActionButton(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled = false } = props;
  const issueService = useMemo(() => new IssueService(), []);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || isLoading) return;
    setIsLoading(true);
    try {
      await issueService.initializeIssuePipeline(workspaceSlug, projectId, issueId);
      window.dispatchEvent(new CustomEvent(ISSUE_PIPELINE_UPDATED, { detail: { issueId } }));
      window.location.hash = "pipeline";
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("issue.pipeline.label"),
      });
      window.setTimeout(() => {
        document.getElementById("issue-pipeline-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: error?.error || error?.detail || error?.message || t("common.error.message"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="secondary" disabled={disabled || isLoading} size="lg" onClick={handleClick}>
      <Workflow className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
      <span className="text-body-xs-medium">{t("issue.pipeline.label")}</span>
    </Button>
  );
}
