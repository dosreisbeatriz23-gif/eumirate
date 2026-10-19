import { beforeEach, describe, expect, it } from "vitest";
import { REFERRAL_GOAL, REWARD_DAYS, REFERRAL_STORAGE_KEY, getReferralVisit, hasRewardAccess, referralProgress, storeReferralVisit } from "./referrals";

describe("referral business rules", () => {
  beforeEach(() => localStorage.clear());
  it("requires three qualified invitations and caps progress", () => {
    expect(REFERRAL_GOAL).toBe(3);
    expect(referralProgress(2)).toBe(2);
    expect(referralProgress(3)).toBe(3);
    expect(referralProgress(4)).toBe(3);
  });
  it("grants exactly thirty days", () => {
    expect(REWARD_DAYS).toBe(30);
    const start = Date.parse("2026-10-19T00:00:00Z");
    const end = new Date(start + REWARD_DAYS * 86400000).toISOString();
    expect(end).toBe("2026-11-18T00:00:00.000Z");
    expect(hasRewardAccess(new Date(start).toISOString(), end, start)).toBe(true);
    expect(hasRewardAccess(new Date(start).toISOString(), end, Date.parse(end))).toBe(false);
  });
  it("banked benefits are not active before their start", () => {
    expect(hasRewardAccess(null, null)).toBe(false);
    expect(hasRewardAccess("2027-01-01", "2027-01-31", Date.parse("2026-10-19"))).toBe(false);
  });
  it("preserves a server visit across navigation", () => {
    storeReferralVisit("server-issued-token");
    expect(getReferralVisit()).toBe("server-issued-token");
  });
  it("never attributes expired or missing provenance", () => {
    expect(getReferralVisit()).toBeNull();
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({ id: "expired", expires: 1 }));
    expect(getReferralVisit()).toBeNull();
    localStorage.setItem(REFERRAL_STORAGE_KEY, "invalid");
    expect(getReferralVisit()).toBeNull();
  });
});