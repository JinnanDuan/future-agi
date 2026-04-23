import { z } from "zod";

export const NumberQuickFilterValidationSchema = z
  .object({
    operator: z.string(),
    value1: z.number().nonnegative("Required"),
    value2: z.number().nonnegative("Required"),
  })
  .superRefine((formValues, ctx) => {
    const operator = formValues.operator;

    if (operator === "between" || operator === "not_in_between") {
      if (formValues.value2 === undefined || formValues.value2 === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["value2"],
        });
      } else if (
        (formValues.value1 !== undefined || formValues.value1 !== null) &&
        formValues.value2 <= formValues.value1
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter a value more than ${formValues.value1}`,
          path: ["value2"],
        });
      }
    }
  });
