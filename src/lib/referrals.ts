export const REFERRAL_GOAL = 3;
export const REWARD_DAYS = 30;
export const REFERRAL_STORAGE_KEY = "eumirate-referral-visit";
export const INVITE_MESSAGE = "Descobri o EUMIRATE, um lugar para organizar os desejos que quero realizar e compartilhar minhas listas com quem eu gosto. Crie sua própria lista também!";

export interface ReferralDashboard {
  code: string;
  qualified: number;
  pending: number;
  first_list_at: string | null;
  paid_premium: boolean;
  premium_active: boolean;
  reward: { earned_at: string; starts_at: string | null; ends_at: string | null } | null;
  history: { id: string; signed_up_at: string; first_list_at: string | null; qualified_at: string | null }[];
}

export function referralProgress(qualified: number) {
  return Math.min(REFERRAL_GOAL, Math.max(0, qualified));
}

export function hasRewardAccess(startsAt: string | null, endsAt: string | null, now = Date.now()) {
  return Boolean(startsAt && endsAt && Date.parse(startsAt) <= now && Date.parse(endsAt) > now);
}

export function getReferralVisit(): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || "null");
    if (stored && typeof stored.id === "string" && stored.expires > Date.now()) return stored.id;
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch { /* Storage can be unavailable in private browsing. */ }
  return null;
}

export function storeReferralVisit(id: string) {
  try { localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({ id, expires: Date.now() + REWARD_DAYS * 86400000 })); } catch { /* Attribution will not be invented without a token. */ }
}

export async function copyReferralLink(link: string) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(link); return; } catch { /* Fall back on browsers without clipboard permission. */ }
  }
  const field = document.createElement("textarea");
  field.value = link;
  field.setAttribute("readonly", "");
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Selecione o link e copie manualmente.");
}