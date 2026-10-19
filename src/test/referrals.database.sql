-- Integration test: disposable users and all writes are rolled back.
BEGIN;
CREATE TEMP TABLE referral_test_users (n integer, id uuid, visit uuid);
INSERT INTO referral_test_users(n,id) SELECT n,gen_random_uuid() FROM generate_series(0,5) n;
DO $$
DECLARE u record; owner_id uuid; owner_code uuid; token uuid; dashboard jsonb; reward_end timestamptz; reward_start timestamptz; count_before bigint;
BEGIN
 SELECT id INTO owner_id FROM referral_test_users WHERE n=0;
 INSERT INTO auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at,raw_user_meta_data) VALUES(owner_id,owner_id::text||'@referral-test.invalid','authenticated','authenticated',now()-interval '2 days',now(),now(),'{}');
 SELECT code INTO owner_code FROM public.referral_accounts WHERE user_id=owner_id;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 FOR u IN SELECT * FROM referral_test_users WHERE n BETWEEN 1 AND 3 ORDER BY n LOOP
  token:=public.start_referral_visit(owner_code);
  IF token IS NULL THEN RAISE EXCEPTION 'Visit token missing'; END IF;
  UPDATE referral_test_users SET visit=token WHERE n=u.n;
  INSERT INTO auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at,raw_user_meta_data) VALUES(u.id,u.id::text||'@referral-test.invalid','authenticated','authenticated',clock_timestamp(),now(),NULL,jsonb_build_object('referral_visit',token));
  IF (SELECT qualified_at FROM public.referrals WHERE referred_id=u.id) IS NOT NULL THEN RAISE EXCEPTION 'Automatic signup list qualified'; END IF;
  PERFORM set_config('request.jwt.claim.sub',u.id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u.id,'role','authenticated')::text,true);
  INSERT INTO public.wishlists(user_id,title) VALUES(u.id,'Explicit test list');
  IF (SELECT qualified_at FROM public.referrals WHERE referred_id=u.id) IS NOT NULL THEN RAISE EXCEPTION 'Unconfirmed user qualified'; END IF;
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  UPDATE auth.users SET email_confirmed_at=now() WHERE id=u.id;
  IF (SELECT qualified_at FROM public.referrals WHERE referred_id=u.id) IS NULL THEN RAISE EXCEPTION 'Confirmed explicit list did not qualify'; END IF;
  IF u.n<3 AND EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=owner_id) THEN RAISE EXCEPTION 'Premature reward'; END IF;
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 END LOOP;
 SELECT starts_at,ends_at INTO reward_start,reward_end FROM public.referral_rewards WHERE user_id=owner_id;
 IF reward_end IS NULL OR reward_end-reward_start<>interval '30 days' THEN RAISE EXCEPTION 'Expected exactly 30 days'; END IF;
 PERFORM public.qualify_referral((SELECT id FROM referral_test_users WHERE n=1));
 IF (SELECT count(*) FROM public.referral_rewards WHERE user_id=owner_id)<>1 OR (SELECT ends_at FROM public.referral_rewards WHERE user_id=owner_id)<>reward_end THEN RAISE EXCEPTION 'Duplicate award'; END IF;
 IF (SELECT is_premium FROM public.profiles WHERE user_id=owner_id) THEN RAISE EXCEPTION 'Reward modified Stripe Premium'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 dashboard:=public.get_referral_dashboard();
 IF (dashboard->>'qualified')::integer<>3 OR NOT (dashboard->>'premium_active')::boolean THEN RAISE EXCEPTION 'Dashboard reward missing'; END IF;
 IF dashboard->'history'->0 ? 'referred_id' OR dashboard->'history'->0 ? 'email' THEN RAISE EXCEPTION 'History exposed personal data'; END IF;
 IF public.start_referral_visit(owner_code) IS NOT NULL THEN RAISE EXCEPTION 'Signed-in visit allowed'; END IF;
 BEGIN
  UPDATE public.profiles SET is_premium=true WHERE user_id=owner_id;
  RAISE EXCEPTION 'Client billing modification allowed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Client billing modification allowed' THEN RAISE; END IF;
 END;
 -- Existing users and self-attribution cannot consume newly issued visits.
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 token:=public.start_referral_visit(owner_code);
 IF public.attribute_referral(owner_id,token) THEN RAISE EXCEPTION 'Self referral allowed'; END IF;
 IF public.attribute_referral((SELECT id FROM referral_test_users WHERE n=1),token) THEN RAISE EXCEPTION 'Existing user attribution allowed'; END IF;
 -- Expired provenance is rejected.
 UPDATE public.referral_visits SET expires_at=now()-interval '1 second' WHERE id=token;
 INSERT INTO auth.users(id,email,created_at,raw_user_meta_data) SELECT id,id::text||'@referral-test.invalid',clock_timestamp(),jsonb_build_object('referral_visit',token) FROM referral_test_users WHERE n=4;
 IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id=(SELECT id FROM referral_test_users WHERE n=4)) THEN RAISE EXCEPTION 'Expired visit accepted'; END IF;
 -- Paid subscribers bank rewards until paid status ends, then retain all thirty days.
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 UPDATE public.referral_rewards SET starts_at=NULL,ends_at=NULL WHERE user_id=owner_id;
 UPDATE public.profiles SET is_premium=true WHERE user_id=owner_id;
 UPDATE public.profiles SET is_premium=false WHERE user_id=owner_id;
 IF (SELECT ends_at-starts_at FROM public.referral_rewards WHERE user_id=owner_id)<>interval '30 days' THEN RAISE EXCEPTION 'Banked reward duration incorrect'; END IF;
 UPDATE public.referral_rewards SET starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' WHERE user_id=owner_id;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 IF public.has_premium_access() THEN RAISE EXCEPTION 'Expired reward still active'; END IF;
 RAISE NOTICE 'PASS: signup, automatic-list exclusion, confirmation, 3 referrals, 30 days, idempotency, private history, self/existing/expired attribution, billing protection, banked benefit and expiry';
END; $$;
-- Verify authenticated role cannot read referral internals or other accounts.
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM referral_test_users WHERE n=0),true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.referral_accounts)<>1 THEN RAISE EXCEPTION 'RLS exposes other accounts'; END IF;
 BEGIN
  PERFORM * FROM public.referrals;
  RAISE EXCEPTION 'Internal referrals readable';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 RAISE NOTICE 'PASS: authenticated RLS and private referral table permissions';
END; $$;
RESET ROLE;
ROLLBACK;