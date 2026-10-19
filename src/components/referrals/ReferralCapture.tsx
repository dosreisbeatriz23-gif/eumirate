import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getReferralVisit, storeReferralVisit } from "@/lib/referrals";

let captureInFlight: Promise<void> | null = null;
export async function captureReferral(code: string) {
  if (captureInFlight) return captureInFlight;
  if (getReferralVisit() || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) return;
  captureInFlight = (async () => {
    const { data, error } = await supabase.rpc("start_referral_visit", { p_code: code });
    if (!error && data) storeReferralVisit(data);
  })();
  try { await captureInFlight; } finally { captureInFlight = null; }
}

export async function awaitReferralCapture() {
  const code = new URLSearchParams(window.location.search).get("ref");
  if (code) await captureReferral(code);
  else if (captureInFlight) await captureInFlight;
}

export function ReferralCapture() {
  const { search } = useLocation();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading || user) return;
    const code = new URLSearchParams(search).get("ref");
    if (code) void captureReferral(code);
  }, [search, user, loading]);
  return null;
}