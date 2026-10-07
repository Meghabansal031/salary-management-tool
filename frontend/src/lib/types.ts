/**
 * Shapes of the API's JSON. They mirror the backend's Pydantic schemas
 * (backend/app/schemas), so a mismatch shows up here as a type error, not as a
 * blank screen at runtime.
 */

// ---------- employees ----------

export type SortField =
  | "full_name"
  | "job_title"
  | "department"
  | "country"
  | "salary"
  | "hire_date";
export type SortOrder = "asc" | "desc";

export interface Employee {
  id: number;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  country: string; // ISO code, for example "GB" for the United Kingdom
  currency: string;
  salary: number; // annual, whole units of `currency`
  hire_date: string; // "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
}

/** What the add/edit form sends. The server fills in id and timestamps. */
export type EmployeeInput = Omit<Employee, "id" | "created_at" | "updated_at">;

export interface EmployeeListParams {
  page?: number;
  page_size?: number;
  q?: string;
  country?: string;
  department?: string;
  job_title?: string;
  sort?: SortField;
  order?: SortOrder;
}

/** How people with the same job title in the same country are paid (local currency). */
export interface PeerStats {
  country: string;
  job_title: string;
  currency: string;
  count: number;
  p25: number;
  median: number;
  p75: number;
}

export interface EmployeePage {
  items: Employee[];
  total: number; // matches across all pages
  page: number;
  page_size: number;
  peer_stats: PeerStats | null;
}

// ---------- insights ----------

export type GroupBy = "country" | "department" | "job_title";
/** "local": each employee's own currency (one country only). "usd": converted, comparable. */
export type Basis = "local" | "usd";

export interface FilterParams {
  q?: string;
  country?: string;
  department?: string;
  job_title?: string;
}

export interface SummaryParams extends FilterParams {
  group_by?: GroupBy;
  basis?: Basis;
}

export interface DistributionParams extends FilterParams {
  bins?: number;
  basis?: Basis;
}

/** p25 to p75 is the "typical range": where the middle half of the group falls. */
export interface GroupStats {
  group: string;
  currency: string | null;
  count: number;
  min: number;
  p25: number;
  median: number;
  average: number;
  p75: number;
  max: number;
}

export interface SummaryResponse {
  group_by: GroupBy;
  basis: Basis;
  items: GroupStats[];
}

export interface DistributionBin {
  start: number;
  end: number;
  count: number;
}

export interface DistributionResponse {
  basis: Basis;
  currency: string | null;
  total: number;
  min: number | null;
  max: number | null;
  bins: DistributionBin[];
}

export interface HeadcountItem {
  country: string;
  country_name: string;
  currency: string;
  headcount: number;
  share_percent: number;
  average_salary_usd: number;
}

export interface HeadcountResponse {
  total: number;
  items: HeadcountItem[];
}

// ---------- dropdown options ----------

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
}

export interface MetaFilters {
  countries: CountryOption[];
  departments: string[];
  job_titles: string[];
  currencies: string[];
}
