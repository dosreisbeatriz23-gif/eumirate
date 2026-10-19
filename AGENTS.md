# Architecture rules
- Keep referrals isolated in referral tables and RPCs; only trusted database triggers qualify invitations and grant rewards to prevent client-side fraud.
- A direct authenticated wishlist insert marks the first user-created list; nested signup-created wishlists are excluded to preserve onboarding without premature qualification.
- Keep paid Premium in profiles.is_premium and promotional access in referral_rewards; use has_premium_access for combined eligibility so Stripe billing remains independent.
- Paid users bank a referral reward until paid Premium ends; a profile trigger starts its full period without changing Stripe subscriptions.
- Referral entry uses expiring server-issued visit tokens persisted locally and validated against auth creation time; existing accounts cannot claim newer visits.
- Public wishlist links resolve through a token-scoped RPC exposing only public content; the public page stays outside the authenticated layout.
- Store referral analytics as real server events; no external analytics provider is assumed.