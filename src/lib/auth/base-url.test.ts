import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequestOrigin } from "./base-url";

const originalBaseUrl = process.env.APP_BASE_URL;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalBaseUrl;
  vi.unstubAllEnvs();
});

describe("getRequestOrigin", () => {
  it("uses the configured canonical origin", () => {
    process.env.APP_BASE_URL = "https://tracker.example.com/ignored-path";

    expect(getRequestOrigin()).toBe("https://tracker.example.com");
  });

  it("uses localhost only when no development origin is configured", () => {
    delete process.env.APP_BASE_URL;

    expect(getRequestOrigin()).toBe("http://localhost:3000");
  });

  it("requires a configured origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.APP_BASE_URL;

    expect(() => getRequestOrigin()).toThrow("APP_BASE_URL must be configured in production.");
  });

  it("rejects a non-HTTP(S) configured origin", () => {
    process.env.APP_BASE_URL = "javascript:alert(1)";

    expect(() => getRequestOrigin()).toThrow("APP_BASE_URL must use HTTP or HTTPS.");
  });
});
