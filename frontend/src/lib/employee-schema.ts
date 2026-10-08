/**
 * The zod schema the form library uses. It holds no rules of its own: it calls
 * validateEmployeeForm (lib/employee-rules.ts, where the rules are written and tested) and
 * reports each problem against its field, so the form library can show it there.
 */

import { z } from "zod";

import {
  todayIso,
  validateEmployeeForm,
  type FormField,
} from "./employee-rules";

export function makeEmployeeSchema(countryCodes?: readonly string[]) {
  return z
    .object({
      full_name: z.string(),
      email: z.string(),
      job_title: z.string(),
      department: z.string(),
      country: z.string(),
      salary: z.string(),
      hire_date: z.string(),
    })
    .superRefine((values, context) => {
      const errors = validateEmployeeForm(values, {
        today: todayIso(),
        countryCodes,
      });
      for (const [field, message] of Object.entries(errors) as [
        FormField,
        string,
      ][]) {
        context.addIssue({ code: "custom", path: [field], message });
      }
    });
}
