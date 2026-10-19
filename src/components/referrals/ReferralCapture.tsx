import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getReferralVisit, storeReferralVisit } from "@/lib/referrals";

export async function captureReferral(code: string) {
  if (getReferralVisit() || !/^[0-9a-f-]{36}$/i.test(code)) return;
  const { data, error } = await supabase.rpc("start_referral_visit", { p_code: code });
  if (!error && data) storeReferralVisit(data);
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