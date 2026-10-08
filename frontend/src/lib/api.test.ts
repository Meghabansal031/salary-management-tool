import { afterEach, describe, expect, it } from "vitest";

import { ApiError, api, buildUrl } from "./api";
import type { EmployeeInput } from "./types";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

interface Call {
  url: string;
  init?: RequestInit;
}

/** Replace fetch with a fake that records the call and answers with `respond()`. */
function fakeFetch(respond: () => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as typeof fetch;
  return calls;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("Expected the request to fail");
}

const input: EmployeeInput = {
  full_name: "Megha Bansal",
  email: "megha.bansal@acme.com",
  job_title: "Software Engineer",
  department: "Engineering",
  country: "IN",
  currency: "INR",
  salary: 2_400_000,
  hire_date: "2021-06-01",
};

describe("buildUrl", () => {
  it("leaves out empty, undefined and null parameters", () => {
    const url = new URL(
      buildUrl("/api/employees", {
        q: "",
        country: "IN",
        page: 2,
        order: undefined,
        x: null,
      }),
    );
    expect([...url.searchParams.keys()].sort()).toEqual(["country", "page"]);
  });

  it("encodes values", () => {
    const url = new URL(
      buildUrl("/api/employees", { job_title: "Software Engineer" }),
    );
    expect(url.searchParams.get("job_title")).toBe("Software Engineer");
  });
});

describe("api calls", () => {
  it("lists employees with only the filled-in parameters", async () => {
    const calls = fakeFetch(() =>
      json({ items: [], total: 0, page: 1, page_size: 25, peer_stats: null }),
    );
    const page = await api.listEmployees({
      q: "",
      country: "IN",
      page_size: 1,
    });

    expect(page.total).toBe(0);
    expect(calls[0].url).toContain("country=IN");
    expect(calls[0].url).toContain("page_size=1");
    expect(calls[0].url).not.toContain("q=");
    expect(calls[0].init?.method).toBe("GET");
  });

  it("sends a JSON body on create", async () => {
    const calls = fakeFetch(() => json({ id: 1 }, 201));
    await api.createEmployee(input);

    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(calls[0].init?.body as string).country).toBe("IN");
  });

  it("updates with PUT on the employee's URL", async () => {
    const calls = fakeFetch(() => json({ id: 7 }));
    await api.updateEmployee(7, input);

    expect(calls[0].url.endsWith("/api/employees/7")).toBe(true);
    expect(calls[0].init?.method).toBe("PUT");
  });

  it("returns nothing for a delete (204)", async () => {
    fakeFetch(() => new Response(null, { status: 204 }));
    expect(await api.deleteEmployee(3)).toBeUndefined();
  });
});

describe("errors", () => {
  it("reports the server's message for a 404", async () => {
    fakeFetch(() => json({ detail: "Employee 999 not found" }, 404));
    const error = await failureOf(api.getEmployee(999));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Employee 999 not found");
    expect(error.fieldErrors).toEqual([]);
  });

  it("keeps the field messages of a 422", async () => {
    fakeFetch(() =>
      json(
        {
          detail: "Validation failed",
          errors: [
            { field: "salary", message: "Input should be greater than 0" },
          ],
        },
        422,
      ),
    );
    const error = await failureOf(api.createEmployee(input));

    expect(error.status).toBe(422);
    expect(error.fieldErrors).toEqual([
      { field: "salary", message: "Input should be greater than 0" },
    ]);
  });

  it("reports a duplicate email (409) and a mixed-currency request (400)", async () => {
    fakeFetch(() =>
      json({ detail: "An employee with this email already exists" }, 409),
    );
    expect((await failureOf(api.createEmployee(input))).status).toBe(409);

    fakeFetch(() =>
      json(
        {
          detail:
            "Local-currency statistics need a single country. Filter by country or use USD.",
        },
        400,
      ),
    );
    const error = await failureOf(api.summary({ group_by: "job_title" }));
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/single country/);
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    fakeFetch(
      () =>
        new Response("oops", {
          status: 500,
          statusText: "Internal Server Error",
        }),
    );
    const error = await failureOf(api.health());

    expect(error.status).toBe(500);
    expect(error.message).toBe("Internal Server Error");
  });

  it("uses status 0 when the server cannot be reached", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const error = await failureOf(api.health());

    expect(error.status).toBe(0);
    expect(error.message).toMatch(/Cannot reach the server/);
  });
});
