/**
 * Turns an API error into messages the form can show: next to the right field when the
 * server says which field is wrong, otherwise as one message for the whole form.
 */

import type { FieldErrors, FormField } from "./employee-rules";

export interface ServerError {
  status: number;
  message: string;
  fieldErrors: { field: string; message: string }[];
}

export interface FormErrors {
  fields: FieldErrors;
  message: string | null;
}

// The server's field names, and where each one is shown. The currency is not a form field
// (it follows the country), so a currency problem is shown next to the country.
const FIELD_FOR: Record<string, FormField> = {
  full_name: "full_name",
  email: "email",
  job_title: "job_title",
  department: "department",
  country: "country",
  currency: "country",
  salary: "salary",
  hire_date: "hire_date",
};

export function serverErrorsToForm(error: ServerError): FormErrors {
  const fields: FieldErrors = {};
  for (const { field, message } of error.fieldErrors) {
    const target = FIELD_FOR[field];
    if (target && !fields[target]) fields[target] = message;
  }
  if (Object.keys(fields).length > 0) return { fields, message: null };

  // "An employee with this email already exists" belongs next to the email box.
  if (error.status === 409)
    return { fields: { email: error.message }, message: null };

  // Anything else (server down, unknown field): one message for the whole form.
  return {
    fields: {},
    message: error.fieldErrors[0]?.message ?? error.message,
  };
}
