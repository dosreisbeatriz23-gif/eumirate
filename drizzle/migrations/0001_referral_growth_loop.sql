CREATE TABLE public.referral_accounts (
 user_id uuid PRIMARY KEY, code uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), first_list_at timestamptz
);
GRANT SELECT ON public.referral_accounts TO authenticated;
GRANT ALL ON public.referral_accounts TO service_role;
ALTER TABLE public.referral_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral account" ON public.referral_accounts FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.referral_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referrer_id uuid NOT NULL REFERENCES public.referral_accounts(user_id), visited_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days', claimed_by uuid UNIQUE
);
GRANT ALL ON public.referral_visits TO service_role;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referrer_id uuid NOT NULL REFERENCES public.referral_accounts(user_id), referred_id uuid NOT NULL UNIQUE, visit_id uuid NOT NULL UNIQUE REFERENCES public.referral_visits(id), visited_at timestamptz NOT NULL, signed_up_at timestamptz NOT NULL, first_list_at timestamptz, qualified_at timestamptz,
 CONSTRAINT no_self_referral CHECK (referrer_id<>referred_id)
);
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE INDEX referrals_by_referrer ON public.referrals(referrer_id);

CREATE TABLE public.referral_rewards (
 user_id uuid PRIMARY KEY REFERENCES public.referral_accounts(user_id), earned_at timestamptz NOT NULL DEFAULT now(), starts_at timestamptz, ends_at timestamptz,
 CONSTRAINT reward_dates_pair CHECK ((starts_at IS NULL AND ends_at IS NULL) OR (starts_at IS NOT NULL AND ends_at=starts_at+interval '30 days'))
);
GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral reward" ON public.referral_rewards FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.referral_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, visit_id uuid REFERENCES public.referral_visits(id), event_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_events TO service_role;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX referral_events_time ON public.referral_events(created_at);

CREATE OR REPLACE FUNCTION public.qualify_referral(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_referrer uuid; v_first timestamptz; v_reward public.referral_rewards; v_paid boolean;
BEGIN
 SELECT referrer_id INTO v_referrer FROM public.referrals WHERE referred_id=p_user_id;
 IF v_referrer IS NULL THEN RETURN; END IF;
 -- Serialize qualifications and awards for the same referrer.
 PERFORM 1 FROM public.referral_accounts WHERE user_id=v_referrer FOR UPDATE;
 SELECT first_list_at INTO v_first FROM public.referral_accounts WHERE user_id=p_user_id;
 IF v_first IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL) THEN RETURN; END IF;
 UPDATE public.referrals SET first_list_at=v_first, qualified_at=now() WHERE referred_id=p_user_id AND qualified_at IS NULL;
 IF FOUND THEN INSERT INTO public.referral_events(user_id,event_name) VALUES (v_referrer,'referral_qualified'); END IF;
 IF (SELECT count(*) FROM public.referrals WHERE referrer_id=v_referrer AND qualified_at IS NOT NULL)>=3 THEN
  SELECT is_premium INTO v_paid FROM public.profiles WHERE user_id=v_referrer FOR UPDATE;
  INSERT INTO public.referral_rewards(user_id,starts_at,ends_at) VALUES (v_referrer,CASE WHEN COALESCE(v_paid,false) THEN NULL ELSE now() END,CASE WHEN COALESCE(v_paid,false) THEN NULL ELSE now()+interval '30 days' END) ON CONFLICT(user_id) DO NOTHING RETURNING * INTO v_reward;
  IF FOUND THEN
   INSERT INTO public.referral_events(user_id,event_name) VALUES (v_referrer,'reward_granted');
   IF v_reward.starts_at IS NOT NULL THEN INSERT INTO public.referral_events(user_id,event_name) VALUES (v_referrer,'premium_reward_activated'); END IF;
  END IF;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_referral(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_referral(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.start_referral_visit(p_code uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_id uuid;
BEGIN
 SELECT user_id INTO v_owner FROM public.referral_accounts WHERE code=p_code;
 IF v_owner IS NULL OR auth.uid() IS NOT NULL THEN RETURN NULL; END IF;
 IF (SELECT count(*) FROM public.referral_visits WHERE referrer_id=v_owner AND visited_at>now()-interval '1 minute')>=100 THEN RETURN NULL; END IF;
 INSERT INTO public.referral_visits(referrer_id) VALUES(v_owner) RETURNING id INTO v_id;
 INSERT INTO public.referral_events(visit_id,event_name) VALUES(v_id,'referral_visit');
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.start_referral_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_referral_visit(uuid) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.attribute_referral(p_user_id uuid,p_visit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_visit public.referral_visits; v_created timestamptz;
BEGIN
 SELECT created_at INTO v_created FROM auth.users WHERE id=p_user_id;
 IF v_created IS NULL THEN RETURN false; END IF;
 SELECT * INTO v_visit FROM public.referral_visits WHERE id=p_visit_id FOR UPDATE;
 IF NOT FOUND OR v_visit.referrer_id=p_user_id OR v_visit.visited_at>v_created OR v_visit.expires_at<v_created OR v_visit.expires_at<now() THEN RETURN false; END IF;
 IF v_visit.claimed_by IS NOT NULL OR EXISTS(SELECT 1 FROM public.referrals WHERE referred_id=p_user_id) THEN
  RETURN EXISTS(SELECT 1 FROM public.referrals WHERE referred_id=p_user_id AND visit_id=p_visit_id);
 END IF;
 INSERT INTO public.referral_accounts(user_id,created_at) VALUES(p_user_id,v_created) ON CONFLICT DO NOTHING;
 INSERT INTO public.referrals(referrer_id,referred_id,visit_id,visited_at,signed_up_at) VALUES(v_visit.referrer_id,p_user_id,p_visit_id,v_visit.visited_at,v_created) ON CONFLICT(referred_id) DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.referral_visits SET claimed_by=p_user_id WHERE id=p_visit_id;
 INSERT INTO public.referral_events(user_id,visit_id,event_name) VALUES(v_visit.referrer_id,p_visit_id,'signup_attributed');
 PERFORM public.qualify_referral(p_user_id);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.attribute_referral(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_referral(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_referral(p_visit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
 RETURN public.attribute_referral(auth.uid(),p_visit_id);
END; $$;
REVOKE ALL ON FUNCTION public.claim_referral(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.referral_on_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_visit text;
BEGIN
 INSERT INTO public.referral_accounts(user_id,created_at) VALUES(NEW.id,NEW.created_at) ON CONFLICT DO NOTHING;
 v_visit:=NEW.raw_user_meta_data->>'referral_visit';
 IF v_visit ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN PERFORM public.attribute_referral(NEW.id,v_visit::uuid); END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.referral_on_signup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER on_auth_referral_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.referral_on_signup();

CREATE OR REPLACE FUNCTION public.referral_on_confirmation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN PERFORM public.qualify_referral(NEW.id); END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.referral_on_confirmation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER on_auth_referral_confirmation AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.referral_on_confirmation();

CREATE OR REPLACE FUNCTION public.referral_on_list() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Nested automatic signup lists never qualify; only a user's direct creation counts.
 IF pg_trigger_depth()<>1 OR auth.uid() IS DISTINCT FROM NEW.user_id THEN RETURN NEW; END IF;
 INSERT INTO public.referral_accounts(user_id) VALUES(NEW.user_id) ON CONFLICT DO NOTHING;
 UPDATE public.referral_accounts SET first_list_at=now() WHERE user_id=NEW.user_id AND first_list_at IS NULL;
 IF FOUND THEN INSERT INTO public.referral_events(user_id,event_name) VALUES(NEW.user_id,'first_list_created'); END IF;
 PERFORM public.qualify_referral(NEW.user_id);
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.referral_on_list() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER referral_first_list AFTER INSERT ON public.wishlists FOR EACH ROW EXECUTE FUNCTION public.referral_on_list();

CREATE OR REPLACE FUNCTION public.referral_on_paid_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.is_premium=false THEN
  UPDATE public.referral_rewards SET starts_at=now(),ends_at=now()+interval '30 days' WHERE user_id=NEW.user_id AND starts_at IS NULL;
  IF FOUND THEN INSERT INTO public.referral_events(user_id,event_name) VALUES(NEW.user_id,'premium_reward_activated'); END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.referral_on_paid_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER referral_activate_after_paid AFTER UPDATE OF is_premium ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.referral_on_paid_change();

CREATE OR REPLACE FUNCTION public.protect_profile_billing() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND COALESCE(auth.role(),'')<>'service_role' AND (NEW.is_premium IS DISTINCT FROM OLD.is_premium OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id) THEN RAISE EXCEPTION 'Dados de assinatura só podem ser alterados pelo servidor'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.protect_profile_billing() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_profile_billing_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing();

CREATE OR REPLACE FUNCTION public.get_referral_dashboard() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_code uuid; v_reward public.referral_rewards; v_paid boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
 INSERT INTO public.referral_accounts(user_id) VALUES(v_uid) ON CONFLICT DO NOTHING;
 SELECT code INTO v_code FROM public.referral_accounts WHERE user_id=v_uid;
 SELECT * INTO v_reward FROM public.referral_rewards WHERE user_id=v_uid;
 SELECT is_premium INTO v_paid FROM public.profiles WHERE user_id=v_uid;
 RETURN jsonb_build_object('code',v_code,'qualified',(SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid AND qualified_at IS NOT NULL),'pending',(SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid AND qualified_at IS NULL),'first_list_at',(SELECT first_list_at FROM public.referral_accounts WHERE user_id=v_uid),'paid_premium',COALESCE(v_paid,false),'premium_active',COALESCE(v_paid,false) OR COALESCE(v_reward.starts_at<=now() AND v_reward.ends_at>now(),false),'reward',CASE WHEN v_reward.user_id IS NULL THEN NULL ELSE jsonb_build_object('earned_at',v_reward.earned_at,'starts_at',v_reward.starts_at,'ends_at',v_reward.ends_at) END,'history',COALESCE((SELECT jsonb_agg(h ORDER BY h.signed_up_at DESC) FROM (SELECT id,signed_up_at,first_list_at,qualified_at FROM public.referrals WHERE referrer_id=v_uid ORDER BY signed_up_at DESC LIMIT 20) h),'[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.get_referral_dashboard() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.has_premium_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND is_premium) OR EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=auth.uid() AND starts_at<=now() AND ends_at>now());
$$;
REVOKE ALL ON FUNCTION public.has_premium_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_premium_access() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.track_referral_event(p_event text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR p_event NOT IN ('card_viewed','invite_clicked','link_copied','share_started') THEN RAISE EXCEPTION 'Evento inválido'; END IF;
 IF (SELECT count(*) FROM public.referral_events WHERE user_id=auth.uid() AND created_at>now()-interval '1 minute')<30 THEN INSERT INTO public.referral_events(user_id,event_name) VALUES(auth.uid(),p_event); END IF;
END; $$;
REVOKE ALL ON FUNCTION public.track_referral_event(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.track_referral_event(text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_public_wishlist(p_token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('title',w.title,'description',w.description,'referral_code',(SELECT code FROM public.referral_accounts WHERE user_id=w.user_id),'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',wi.id,'name',wi.name,'description',wi.description,'price_range',wi.price_range,'image_url',wi.image_url,'external_link',wi.external_link,'is_reserved',wi.is_reserved) ORDER BY wi.created_at) FROM public.wishlist_items wi WHERE wi.wishlist_id=w.id AND wi.visibility='public'),'[]'::jsonb)) FROM public.wishlists w WHERE w.share_token=p_token AND w.visibility='public' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_wishlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_wishlist(uuid) TO anon,authenticated,service_role;