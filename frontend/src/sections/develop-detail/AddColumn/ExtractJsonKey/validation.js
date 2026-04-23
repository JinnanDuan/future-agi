import { z } from "zod";

export const ExtractJsonKeyValidationSchema = (
  isConditionalNode = false,
  isEdit = false,
) => {
  return z.object({
    columnId: z.string().min(1, "Column is required"),
    jsonKey: z.string().min(1, "JSON Key is required"),
    newColumnName:
      isConditionalNode || isEdit
        ? z.string().optional()
        : z.string().min(1, "New Column Name is required"),
    concurrency: z.number().positive("Concurrency must be a positive integer"),
  });
};
