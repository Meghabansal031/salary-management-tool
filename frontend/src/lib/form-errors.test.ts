import { describe, expect, it } from "vitest";

import { serverErrorsToForm } from "./form-errors";

describe("serverErrorsToForm", () => {
  it("puts each server message next to its field", () => {
    const result = serverErrorsToForm({
      status: 422,
      message: "Validation failed",
      fieldErrors: [
        { field: "salary", message: "Input should be greater than 0" },
        { field: "email", message: "Enter a valid email address" },
      ],
    });
    expect(result).toEqual({
      fields: {
        salary: "Input should be greater than 0",
        email: "Enter a valid email address",
      },
      message: null,
    });
  });

  it("shows a currency problem next to the country", () => {
    const result = serverErrorsToForm({
      status: 422,
      message: "Validation failed",
      fieldErrors: [
        { field: "currency", message: "Currency for DE must be EUR" },
      ],
    });
    expect(result.fields).toEqual({ country: "Currency for DE must be EUR" });
  });

  it("keeps the first message when a field is reported twice", () => {
    const result = serverErrorsToForm({
      status: 422,
      message: "Validation failed",
      fieldErrors: [
        { field: "salary", message: "first" },
        { field: "salary", message: "second" },
      ],
    });
    expect(result.fields.salary).toBe("first");
  });

  it("shows a duplicate email (409) next to the email box", () => {
    const result = serverErrorsToForm({
      status: 409,
      message: "An employee with this email already exists",
      fieldErrors: [],
    });
    expect(result).toEqual({
      fields: { email: "An employee with this email already exists" },
      message: null,
    });
  });

  it("shows other failures as one message for the whole form", () => {
    expect(
      serverErrorsToForm({
        status: 0,
        message: "Cannot reach the server. Is the backend running?",
        fieldErrors: [],
      }),
    ).toEqual({
      fields: {},
      message: "Cannot reach the server. Is the backend running?",
    });
    expect(
      serverErrorsToForm({
        status: 500,
        message: "Internal Server Error",
        fieldErrors: [],
      }).message,
    ).toBe("Internal Server Error");
  });

  it("uses the server's message when it names a field the form does not have", () => {
    const result = serverErrorsToForm({
      status: 422,
      message: "Validation failed",
      fieldErrors: [{ field: "nickname", message: "Unknown field" }],
    });
    expect(result).toEqual({ fields: {}, message: "Unknown field" });
  });
});
