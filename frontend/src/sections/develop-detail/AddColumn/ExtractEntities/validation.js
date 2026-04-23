import { z } from "zod";

export const ExtractEntitiesValidationSchema = (
  isConditioalNode = false,
  isEdit,
) => {
  return z.object({
    type: z.string().optional(),
    columnId: z
      .string({
        required_error: "Column ID is required",
      })
      .min(1, {
        message: "Column is required",
      }),
    instruction: z
      .string({
        required_error: "Instruction is required",
      })
      .min(1, {
        message: "Instruction is required",
      }),
    languageModelId: z
      .string({
        required_error: "Language Model is required",
      })
      .min(1, {
        message: "Language Model is required",
      }),
    concurrency: z.number().positive("Concurrency must be a positive integer"),
    newColumnName:
      isConditioalNode || isEdit
        ? z.string().optional()
        : z
            .string({
              required_error: "New Column Name is required",
            })
            .min(1, {
              message: "New Column Name is required",
            }),
  });
};
