CREATE TRIGGER trg_free_item_on_reservation_delete
AFTER DELETE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.free_item_on_reservation_delete();