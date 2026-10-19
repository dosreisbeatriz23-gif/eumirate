CREATE OR REPLACE FUNCTION public.protect_profile_billing() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND COALESCE(auth.role(),'')<>'service_role' THEN
  IF TG_OP='INSERT' THEN
   IF NEW.is_premium OR NEW.stripe_customer_id IS NOT NULL OR NEW.stripe_subscription_id IS NOT NULL THEN RAISE EXCEPTION 'Dados de assinatura só podem ser alterados pelo servidor'; END IF;
  ELSIF NEW.is_premium IS DISTINCT FROM OLD.is_premium OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
   RAISE EXCEPTION 'Dados de assinatura só podem ser alterados pelo servidor';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.protect_profile_billing() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_profile_billing_insert BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing();
CREATE OR REPLACE FUNCTION public.referral_on_paid_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.is_premium=false THEN
  UPDATE public.referral_rewards SET starts_at=now(),ends_at=now()+interval '30 days' WHERE user_id=NEW.user_id AND starts_at IS NULL;
  IF FOUND THEN INSERT INTO public.referral_events(user_id,event_name) VALUES(NEW.user_id,'premium_reward_activated'); END IF;
 ELSIF OLD.is_premium=false AND NEW.is_premium=true AND NEW.stripe_subscription_id IS NOT NULL THEN
  INSERT INTO public.referral_events(user_id,event_name) VALUES(NEW.user_id,'paid_premium_conversion');
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.referral_on_paid_change() FROM PUBLIC,anon,authenticated;