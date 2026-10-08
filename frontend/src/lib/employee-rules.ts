/**
 * Validation and conversion for the add/edit employee form, as plain functions with no React
 * and no libraries, so they are easy to test. The rules mirror the backend's
 * (backend/app/schemas/employee.py): the form catches mistakes instantly, and the server
 * still has the final word.
 */

import type { Employee, EmployeeInput } from "./types";

export const MAX_SALARY = 1_000_000_000;
export const EARLIEST_HIRE_DATE = "1950-01-01";

// Same practical email check as the backend: local part, "@", dotted domain, 2+ letter ending.
const EMAIL_PATTERN =
  /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Every field is text, as typed. The salary is turned into a number only when saving. */
export interface EmployeeFormValues {
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  country: string;
  salary: string;
  hire_date: string; // "YYYY-MM-DD"
}

export type FormField = keyof EmployeeFormValues;
export type FieldErrors = Partial<Record<FormField, string>>;

export const EMPTY_FORM: EmployeeFormValues = {
  full_name: "",
  email: "",
  job_title: "",
  department: "",
  country: "",
  salary: "",
  hire_date: "",
};

export interface RuleContext {
  /** Today as "YYYY-MM-DD" (passed in, so tests do not depend on the clock). */
  today: string;
  /** Supported country codes. Left out while the dropdown options are still loading. */
  countryCodes?: readonly string[];
}

/** Today's date in the user's own time zone, as "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "85,000" or " 85 000 " -> 85000. Anything that is not whole digits (85000.5, abc, -5) -> null. */
export function parseSalary(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

function isRealDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function textError(
  value: string,
  emptyMessage: string,
  maxLength: number,
): string | null {
  const text = value.trim();
  if (text.length === 0) return emptyMessage;
  if (text.length > maxLength) return `Use ${maxLength} characters or fewer`;
  return null;
}

function emailError(value: string): string | null {
  const email = value.trim();
  if (email.length === 0) return "Enter an email address";
  if (email.length > 254 || !EMAIL_PATTERN.test(email))
    return "Enter a valid email address";
  return null;
}

function countryError(value: string, codes?: readonly string[]): string | null {
  const code = value.trim().toUpperCase();
  if (code === "") return "Choose a country";
  if (codes && !codes.includes(code)) return "Choose a supported country";
  return null;
}

function salaryError(value: string): string | null {
  if (value.trim() === "") return "Enter the annual salary";
  const salary = parseSalary(value);
  if (salary === null) return "Use whole numbers only, for example 85000";
  if (salary <= 0) return "Salary must be greater than 0";
  if (salary > MAX_SALARY)
    return `Salary must be at most ${MAX_SALARY.toLocaleString("en-US")}`;
  return null;
}

function hireDateError(value: string, today: string): string | null {
  if (value.trim() === "") return "Choose the hire date";
  if (!isRealDate(value)) return "Enter a valid date";
  // "YYYY-MM-DD" strings sort in date order, so plain comparison is correct and avoids time zones.
  if (value > today) return "Hire date cannot be in the future";
  if (value < EARLIEST_HIRE_DATE)
    return `Hire date cannot be before ${EARLIEST_HIRE_DATE.slice(0, 4)}`;
  return null;
}

/** All problems at once, one message per field. An empty object means the form is valid. */
export function validateEmployeeForm(
  values: EmployeeFormValues,
  context: RuleContext,
): FieldErrors {
  const checks: [FormField, string | null][] = [
    [
      "full_name",
      textError(values.full_name, "Enter the employee's name", 120),
    ],
    ["email", emailError(values.email)],
    ["job_title", textError(values.job_title, "Enter a job title", 80)],
    ["department", textError(values.department, "Enter a department", 80)],
    ["country", countryError(values.country, context.countryCodes)],
    ["salary", salaryError(values.salary)],
    ["hire_date", hireDateError(values.hire_date, context.today)],
  ];
  const errors: FieldErrors = {};
  for (const [field, message] of checks) {
    if (message) errors[field] = message;
  }
  return errors;
}

/** Clean the typed values into what the API expects. Call only after validation has passed. */
export function toEmployeeInput(
  values: EmployeeFormValues,
  currency: string,
): EmployeeInput {
  const salary = parseSalary(values.salary);
  if (salary === null) throw new Error("Salary was not validated");
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim().toLowerCase(),
    job_title: values.job_title.trim(),
    department: values.department.trim(),
    country: values.country.trim().toUpperCase(),
    currency,
    salary,
    hire_date: values.hire_date,
  };
}

/** Fill the edit form from an existing employee. */
export function employeeToFormValues(employee: Employee): EmployeeFormValues {
  return {
    full_name: employee.full_name,
    email: employee.email,
    job_title: employee.job_title,
    department: employee.department,
    country: employee.country,
    salary: String(employee.salary),
    hire_date: employee.hire_date,
  };
}
