
DO $$
DECLARE
  v_uid uuid := 'd0350e23-e3c7-45e7-ad71-82ed075a28bd';
  v_before numeric;
  v_after numeric;
BEGIN
  PERFORM set_config('viax.progression', 'on', true);

  SELECT balance INTO v_before FROM public.profiles WHERE id = v_uid FOR UPDATE;
  v_after := v_before + 100;

  UPDATE public.profiles SET balance = v_after WHERE id = v_uid;

  INSERT INTO public.transactions (
    user_id, type, amount, before_balance, after_balance, market_label
  ) VALUES (
    v_uid, 'bonus', 100, v_before, v_after, 'Crédito manual (suporte)'
  );

  INSERT INTO public.notifications (user_id, kind, text)
  VALUES (v_uid, 'alert', 'Crédito de 100 BRL adicionado à sua carteira.');
END $$;
