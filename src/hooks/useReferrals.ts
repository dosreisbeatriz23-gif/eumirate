import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ReferralDashboard } from "@/lib/referrals";

export function useReferrals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["referrals", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_referral_dashboard");
      if (error) throw error;
      return data as unknown as ReferralDashboard;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export async function trackReferral(event: "card_viewed" | "invite_clicked" | "link_copied" | "share_started") {
  await supabase.rpc("track_referral_event", { p_event: event });
}