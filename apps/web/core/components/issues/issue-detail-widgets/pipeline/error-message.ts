type TTranslate = (key: string) => string;

const PIPELINE_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  "Pipeline item start date cannot be earlier than the previous item target date":
    "issue.pipeline.errors.start_date_before_previous_target_date",
  "Pipeline item target date cannot be later than the next item start date":
    "issue.pipeline.errors.target_date_after_next_start_date",
};

export const getPipelineErrorMessage = (t: TTranslate, error: any) => {
  const message = error?.error || error?.detail || error?.message;

  if (typeof message === "string") {
    const translationKey = PIPELINE_ERROR_TRANSLATION_KEYS[message];
    return translationKey ? t(translationKey) : message;
  }

  return t("common.error.message");
};
