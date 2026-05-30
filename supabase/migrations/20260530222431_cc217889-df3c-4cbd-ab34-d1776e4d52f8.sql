
CREATE OR REPLACE FUNCTION public.delete_league(p_league_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT created_by INTO v_owner FROM public.leagues WHERE id = p_league_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.league_members WHERE league_id = p_league_id;
  DELETE FROM public.leagues WHERE id = p_league_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_league(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_league(uuid) TO authenticated;
