REVOKE ALL ON public.referrals,public.referral_visits,public.referral_events FROM anon,authenticated;
REVOKE ALL ON public.referral_accounts,public.referral_rewards FROM anon,authenticated;
GRANT SELECT ON public.referral_accounts,public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_accounts,public.referrals,public.referral_visits,public.referral_events,public.referral_rewards TO service_role;