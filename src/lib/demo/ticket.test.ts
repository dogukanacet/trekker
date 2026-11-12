import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoTicket, verifyDemoTicket } from "./ticket";
import { coreDemoEmail, demoInviteEmail, isCoreDemoUserEmail } from "./guards";

describe("demo ticket", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("round-trips a user id", () => {
    expect(verifyDemoTicket(createDemoTicket("user123"))).toBe("user123");
  });

  it("rejects a ticket whose user id was swapped", () => {
    const [, expires, signature] = createDemoTicket("user123").split(".");
    expect(verifyDemoTicket(`other.${expires}.${signature}`)).toBeNull();
  });

  it("rejects an expired ticket", () => {
    vi.useFakeTimers();
    const ticket = createDemoTicket("user123");
    vi.advanceTimersByTime(61_000);
    expect(verifyDemoTicket(ticket)).toBeNull();
  });

  it("rejects a ticket signed with another secret", () => {
    const ticket = createDemoTicket("user123");
    vi.stubEnv("AUTH_SECRET", "different-secret");
    expect(verifyDemoTicket(ticket)).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "a.b", "a.b.c.d", "a.b.c"]) {
      expect(verifyDemoTicket(bad)).toBeNull();
    }
  });
});

describe("demo email helpers", () => {
  it("rewrites invites to an unroutable, tenant-scoped address", () => {
    expect(demoInviteEmail("Ali.Veli@Gmail.com", "abc123")).toBe("ali.veli+abc123@demo.invalid");
    expect(demoInviteEmail("@x.com", "abc123")).toBe("invitee+abc123@demo.invalid");
  });

  it("recognizes only the seeded accounts as core users", () => {
    expect(isCoreDemoUserEmail(coreDemoEmail("abc123", "ADMIN"))).toBe(true);
    expect(isCoreDemoUserEmail(demoInviteEmail("demo-abc123-admin@x.com", "abc123"))).toBe(false);
    expect(isCoreDemoUserEmail("admin@trekker.dev")).toBe(false);
  });
});
