-- =====================================================================
-- EUMIRATE — Trava dos limites do plano Free (aplicada no banco)
--
-- Regras do Free:  1 lista privada + 1 lista pública · 6 links (itens) no total
--                  · 1 grupo criado (entrar em grupos de amigos é livre).
-- Premium (pago OU 30 dias por indicação) = ilimitado, via public.has_premium_access().
--
-- • Só vale para NOVOS registros: nada do que já existe é apagado ou alterado.
-- • Rotinas do sistema (cadastro, service role — sem usuário logado) não são bloqueadas.
-- • O app mostra a janela de upgrade quando o banco responde plan_limit_*.
-- =====================================================================

-- 1) Listas: 1 privada + 1 pública
CREATE OR REPLACE FUNCTION public.enforce_free_list_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_public boolean := (COALESCE(NEW.visibility, 'private') = 'public');
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN RETURN NEW; END IF;
  IF public.has_premium_access() THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.wishlists
        WHERE user_id = NEW.user_id
          AND (COALESCE(visibility, 'private') = 'public') = is_public) >= 1 THEN
    RAISE EXCEPTION 'plan_limit_lists';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_free_list_limit ON public.wishlists;
CREATE TRIGGER trg_free_list_limit BEFORE INSERT ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_list_limit();

-- 2) Itens: 6 no total (somando todas as listas da pessoa)
CREATE OR REPLACE FUNCTION public.enforce_free_item_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE list_owner uuid;
BEGIN
  SELECT user_id INTO list_owner FROM public.wishlists WHERE id = NEW.wishlist_id;
  IF auth.uid() IS NULL OR list_owner IS NULL OR auth.uid() <> list_owner THEN RETURN NEW; END IF;
  IF public.has_premium_access() THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.wishlist_items wi
        JOIN public.wishlists w ON w.id = wi.wishlist_id
        WHERE w.user_id = list_owner) >= 6 THEN
    RAISE EXCEPTION 'plan_limit_items';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_free_item_limit ON public.wishlist_items;
CREATE TRIGGER trg_free_item_limit BEFORE INSERT ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_item_limit();

-- 3) Grupos: 1 grupo criado (entrar em grupos de outras pessoas não é limitado)
CREATE OR REPLACE FUNCTION public.enforce_free_group_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.owner_id THEN RETURN NEW; END IF;
  IF public.has_premium_access() THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.groups WHERE owner_id = NEW.owner_id) >= 1 THEN
    RAISE EXCEPTION 'plan_limit_groups';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_free_group_limit ON public.groups;
CREATE TRIGGER trg_free_group_limit BEFORE INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_group_limit();

-- ---------------------------------------------------------------------
-- PARA DESFAZER (se precisar):
--   DROP TRIGGER IF EXISTS trg_free_list_limit  ON public.wishlists;
--   DROP TRIGGER IF EXISTS trg_free_item_limit  ON public.wishlist_items;
--   DROP TRIGGER IF EXISTS trg_free_group_limit ON public.groups;
-- ---------------------------------------------------------------------