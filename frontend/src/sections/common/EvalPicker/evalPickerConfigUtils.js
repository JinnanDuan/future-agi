const OUTPUT_TYPE_CONFIG_MAP = {
  pass_fail: "Pass/Fail",
  percentage: "score",
  deterministic: "choices",
};

export const hasNonEmptyPromptMessage = (messages = []) =>
  messages.some((message) => {
    if (!["system", "user"].includes(message?.role)) return false;

    const normalizedContent = String(message?.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim();

    return normalizedContent.length > 0;
  });

export const buildEvalTemplateConfig = ({
  baseConfig = {},
  evalType,
  instructions,
  code,
  codeLanguage,
  messages = [],
  fewShotExamples = [],
  outputType,
  passThreshold,
  choiceScores,
  templateFormat,
}) => {
  const nextConfig = {
    ...baseConfig,
    rule_prompt: evalType === "code" ? "" : instructions,
    output: OUTPUT_TYPE_CONFIG_MAP[outputType] || baseConfig?.output,
    pass_threshold: passThreshold,
    template_format: templateFormat,
  };

  if (evalType === "code") {
    nextConfig.code = code;
    nextConfig.language = codeLanguage;
  }

  if (evalType === "llm") {
    nextConfig.messages = messages;

    if (fewShotExamples.length > 0) {
      nextConfig.few_shot_examples = fewShotExamples;
    } else {
      delete nextConfig.few_shot_examples;
    }
  }

  if (choiceScores && Object.keys(choiceScores).length > 0) {
    nextConfig.choice_scores = choiceScores;
  } else {
    delete nextConfig.choice_scores;
  }

  return nextConfig;
};
