import { describe, expect, it } from "vitest";

import {
  EMPTY_FORM,
  MAX_SALARY,
  employeeToFormValues,
  parseSalary,
  toEmployeeInput,
  todayIso,
  validateEmployeeForm,
  type EmployeeFormValues,
} from "./employee-rules";
import type { Employee } from "./types";

const TODAY = "2026-10-08";
const CODES = ["IN", "DE", "GB", "US"];

const valid: EmployeeFormValues = {
  full_name: "Megha Bansal",
  email: "megha.bansal@acme.com",
  job_title: "Software Engineer",
  department: "Engineering",
  country: "IN",
  salary: "2400000",
  hire_date: "2021-06-01",
};

const check = (overrides: Partial<EmployeeFormValues>) =>
  validateEmployeeForm(
    { ...valid, ...overrides },
    { today: TODAY, countryCodes: CODES },
  );

describe("validateEmployeeForm", () => {
  it("accepts a valid form", () => {
    expect(check({})).toEqual({});
  });

  it("reports every empty field at once", () => {
    const errors = validateEmployeeForm(EMPTY_FORM, {
      today: TODAY,
      countryCodes: CODES,
    });
    expect(Object.keys(errors).sort()).toEqual([
      "country",
      "department",
      "email",
      "full_name",
      "hire_date",
      "job_title",
      "salary",
    ]);
  });

  it("checks name, job title and department lengths", () => {
    expect(check({ full_name: "   " }).full_name).toBe(
      "Enter the employee's name",
    );
    expect(check({ full_name: "x".repeat(120) }).full_name).toBeUndefined();
    expect(check({ full_name: "x".repeat(121) }).full_name).toBe(
      "Use 120 characters or fewer",
    );
    expect(check({ job_title: "x".repeat(81) }).job_title).toBe(
      "Use 80 characters or fewer",
    );
    expect(check({ department: "" }).department).toBe("Enter a department");
  });

  it("accepts good emails, in any letter case, and rejects bad ones", () => {
    expect(
      check({ email: "First.Last+tag@Sub.Example.co.uk" }).email,
    ).toBeUndefined();
    for (const bad of [
      "plainaddress",
      "a@b",
      "a@@b.com",
      "a b@x.com",
      "@x.com",
      "a@x.",
      "a@.com",
    ]) {
      expect(check({ email: bad }).email).toBe("Enter a valid email address");
    }
    expect(check({ email: "" }).email).toBe("Enter an email address");
  });

  it("checks the country against the supported list when it is known", () => {
    expect(check({ country: "" }).country).toBe("Choose a country");
    expect(check({ country: "XX" }).country).toBe("Choose a supported country");
    expect(check({ country: "in" }).country).toBeUndefined(); // case does not matter
    // while the dropdown options are still loading there is no list to check against
    expect(
      validateEmployeeForm({ ...valid, country: "XX" }, { today: TODAY })
        .country,
    ).toBeUndefined();
  });

  it("checks the salary", () => {
    expect(check({ salary: "" }).salary).toBe("Enter the annual salary");
    expect(check({ salary: "abc" }).salary).toBe(
      "Use whole numbers only, for example 85000",
    );
    expect(check({ salary: "85000.5" }).salary).toBe(
      "Use whole numbers only, for example 85000",
    );
    expect(check({ salary: "-5" }).salary).toBe(
      "Use whole numbers only, for example 85000",
    );
    expect(check({ salary: "0" }).salary).toBe("Salary must be greater than 0");
    expect(check({ salary: "1" }).salary).toBeUndefined();
    expect(check({ salary: String(MAX_SALARY) }).salary).toBeUndefined();
    expect(check({ salary: String(MAX_SALARY + 1) }).salary).toBe(
      "Salary must be at most 1,000,000,000",
    );
    expect(check({ salary: "85,000" }).salary).toBeUndefined();
  });

  it("checks the hire date", () => {
    expect(check({ hire_date: "" }).hire_date).toBe("Choose the hire date");
    expect(check({ hire_date: TODAY }).hire_date).toBeUndefined();
    expect(check({ hire_date: "2026-10-09" }).hire_date).toBe(
      "Hire date cannot be in the future",
    );
    expect(check({ hire_date: "1949-12-31" }).hire_date).toBe(
      "Hire date cannot be before 1950",
    );
    expect(check({ hire_date: "1950-01-01" }).hire_date).toBeUndefined();
    expect(check({ hire_date: "2021-02-30" }).hire_date).toBe(
      "Enter a valid date",
    );
    expect(check({ hire_date: "06/01/2021" }).hire_date).toBe(
      "Enter a valid date",
    );
  });
});

describe("parseSalary", () => {
  it("accepts whole numbers with separators", () => {
    expect(parseSalary("85000")).toBe(85000);
    expect(parseSalary("85,000")).toBe(85000);
    expect(parseSalary(" 85 000 ")).toBe(85000);
  });

  it("rejects everything else", () => {
    for (const bad of ["", "abc", "85000.5", "-5", "1e5", "12a"]) {
      expect(parseSalary(bad)).toBeNull();
    }
  });
});

describe("toEmployeeInput", () => {
  it("trims, normalizes and converts the salary", () => {
    const input = toEmployeeInput(
      {
        ...valid,
        full_name: "  Megha Bansal ",
        email: " Megha.Bansal@ACME.com ",
        country: " in ",
        salary: "2,400,000",
      },
      "INR",
    );
    expect(input).toEqual({
      full_name: "Megha Bansal",
      email: "megha.bansal@acme.com",
      job_title: "Software Engineer",
      department: "Engineering",
      country: "IN",
      currency: "INR",
      salary: 2_400_000,
      hire_date: "2021-06-01",
    });
  });

  it("refuses an invalid salary instead of sending nonsense", () => {
    let failed = false;
    try {
      toEmployeeInput({ ...valid, salary: "abc" }, "INR");
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});

describe("employeeToFormValues", () => {
  it("fills the edit form, with the salary as text", () => {
    const employee: Employee = {
      id: 7,
      ...{
        full_name: "Megha Bansal",
        email: "megha.bansal@acme.com",
        job_title: "Software Engineer",
        department: "Engineering",
      },
      country: "IN",
      currency: "INR",
      salary: 2_400_000,
      hire_date: "2021-06-01",
      created_at: "2026-01-01T09:00:00",
      updated_at: "2026-01-01T09:00:00",
    };
    expect(employeeToFormValues(employee)).toEqual(valid);
  });
});

describe("todayIso", () => {
  it("is the local date, zero-padded", () => {
    expect(todayIso(new Date(2026, 9, 8, 23, 59))).toBe("2026-10-08");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
