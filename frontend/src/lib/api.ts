/**
 * The only place that talks to the backend. Components call these typed functions and
 * never build URLs or parse errors themselves.
 */

import type {
  DistributionParams,
  DistributionResponse,
  Employee,
  EmployeeInput,
  EmployeeListParams,
  EmployeePage,
  HeadcountResponse,
  FilterParams,
  MetaFilters,
  SummaryParams,
  SummaryResponse,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/** One message tied to one form field, as returned by the API for a 422 response. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Any failed call. `fieldErrors` is filled for validation problems, so a form can show
 * each message next to its field; `status` 0 means the server could not be reached.
 */
export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Build a URL, leaving out parameters that are empty so the server never sees "?q=". */
export function buildUrl(path: string, params?: object): string {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: object;
  body?: unknown;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", params, body } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  if (response.status === 204) return undefined as T; // delete: success, no body

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data?.detail === "string"
        ? data.detail
        : response.statusText || "Request failed",
      Array.isArray(data?.errors) ? data.errors : [],
    );
  }
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  // employees
  listEmployees: (params: EmployeeListParams = {}) =>
    request<EmployeePage>("/api/employees", { params }),
  getEmployee: (id: number) => request<Employee>(`/api/employees/${id}`),
  createEmployee: (input: EmployeeInput) =>
    request<Employee>("/api/employees", { method: "POST", body: input }),
  updateEmployee: (id: number, input: EmployeeInput) =>
    request<Employee>(`/api/employees/${id}`, { method: "PUT", body: input }),
  deleteEmployee: (id: number) =>
    request<void>(`/api/employees/${id}`, { method: "DELETE" }),

  // insights
  summary: (params: SummaryParams = {}) =>
    request<SummaryResponse>("/api/insights/summary", { params }),
  distribution: (params: DistributionParams = {}) =>
    request<DistributionResponse>("/api/insights/distribution", { params }),
  headcount: (params: FilterParams = {}) =>
    request<HeadcountResponse>("/api/insights/headcount", { params }),

  // dropdown options
  filters: () => request<MetaFilters>("/api/meta/filters"),
};
