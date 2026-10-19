# Referral implementation and verification

## Added experience
- Home card and invitation dialog: real progress, persistent exclusive link, copy confirmation, native sharing with functional copy fallback, anonymous history and rules.
- First explicitly created list reveals the invitation card in Minhas Listas. Signup has nonblocking program information.
- Public `/compartilhado/:token` page renders only public list content and offers signup with preserved referral origin. Previously generated share URLs now resolve.
- Profile displays effective Premium when either paid access or a valid referral reward is active.

## Components and integration points
- Added `ReferralCard`, `ReferralCapture`, `PublicWishlist`, `useReferrals` and referral utilities.
- Updated Home, Minhas Listas, Login, AuthContext, ListDetail, Perfil and route registration without replacing existing screens/navigation.
- Added `referral_accounts`, `referral_visits`, `referrals`, `referral_rewards`, `referral_events` with explicit grants and RLS.
- Attribution, qualification, award and Premium access are server-side RPCs/triggers. Referred IDs and visit secrets are not exposed in dashboard history.

## Rules
- Three new, confirmed accounts with server-recorded provenance and a directly user-created first wishlist earn exactly 30 days, once per referrer.
- Signup's automatic default wishlist does not qualify. Shares/clicks never qualify. First recorded origin is retained for up to 30 days.
- Prevent self-attribution, existing users claiming newer visits, duplicate invitees, reused visit tokens and repeated rewards. Awards serialize on the referrer to withstand concurrent qualifications.
- Referral Premium is separate from paid `is_premium`; no paid subscription is created, modified or canceled. Paid users bank the full reward until the paid status ends.
- `has_premium_access` is the server-controlled combined access check. Existing app had no Premium-only feature gates, so no new Free restrictions were invented.
- Client profile writes cannot alter billing fields, including during inserts.
- Referral events are actually persisted in Lovable Cloud; there is no external analytics integration or fictitious sending claim. Shares started are separate from qualified referrals; native completion/recipient actions are not claimed measurable.

## Verified
- Five Vitest tests pass: goal, exact 30-day expiry, banked access, persisted provenance, missing/expired provenance.
- Privileged rollback-only database integration passed: signup trigger, automatic-list exclusion, confirmation requirement, three-referral qualification, 30-day reward, idempotency, history privacy, existing/self/expired attribution, billing-field protection, delayed activation and expiry. All temporary accounts were rolled back; a follow-up query found zero temporary accounts.
- Authenticated RLS test passed after explicitly revoking inherited table grants: only own referral account accessible; referrals/visit tokens unavailable; direct reward insertion denied.
- Browser: authenticated Home invitation dialog, clipboard contents and copy fallback; 390px mobile panel without horizontal overflow; anonymous referral visit retained through navigation; existing public-list sharing, anonymous mobile display, signup CTA and preserved origin; invalid public-list state. No runtime page errors in the main panel flow.
- Preview compilation reports build OK.

## Remaining verification
- Live signup attempt with a reserved test domain was rejected by hosted email validation. Email confirmation and Google OAuth were not completed in-browser with a genuine new user. They require a real receiving test address and provider interaction. Server signup/confirmation/list qualification was verified transactionally, not represented as a completed live email/OAuth journey.
- Native device share sheet was not available in the headless browser. Copy fallback was verified; native sharing still needs a supporting real device.
- No Stripe purchase was performed or existing billing changed. The independent entitlement and paid-status transition were database-tested; no claim of a live billing test.