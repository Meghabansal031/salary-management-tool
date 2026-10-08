import { describe, expect, it } from "vitest";

import { EMPTY_FORM } from "./employee-rules";
import { makeEmployeeSchema } from "./employee-schema";

const valid = {
  full_name: "Megha Bansal",
  email: "megha.bansal@acme.com",
  job_title: "Software Engineer",
  department: "Engineering",
  country: "IN",
  salary: "2400000",
  hire_date: "2021-06-01",
};

function failedFields(values: typeof EMPTY_FORM, codes?: string[]): string[] {
  const result = makeEmployeeSchema(codes).safeParse(values);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0])).sort();
}

describe("makeEmployeeSchema (the glue between the rules and the form library)", () => {
  it("accepts a valid form", () => {
    expect(makeEmployeeSchema(["IN"]).safeParse(valid).success).toBe(true);
  });

  it("reports each problem against its own field", () => {
    expect(failedFields({ ...valid, salary: "0", email: "nope" })).toEqual([
      "email",
      "salary",
    ]);
  });

  it("reports every field of an empty form", () => {
    expect(failedFields(EMPTY_FORM)).toHaveLength(7);
  });

  it("uses the supported country list it is given", () => {
    expect(failedFields({ ...valid, country: "XX" }, ["IN", "DE"])).toEqual([
      "country",
    ]);
  });
});
