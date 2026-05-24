-- Market probability alerts
-- Usuário cria um alerta: "me avise quando SIM chegar em X%"
-- Verificação acontece via trigger no UPDATE de markets (pool_yes, pool_no)

CREATE TABLE IF NOT EXISTS market_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id   text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side        text NOT NULL CHECK (side IN ('YES', 'NO')),
  threshold   numeric(5,2) NOT NULL CHECK (threshold BETWEEN 1 AND 99),
  triggered   boolean NOT NULL DEFAULT false,
  triggered_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX market_alerts_user ON market_alerts(user_id);
CREATE INDEX market_alerts_market ON market_alerts(market_id) WHERE NOT triggered;

-- RLS
ALTER TABLE market_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_alerts" ON market_alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: check alerts on pool update and fire notifications
CREATE OR REPLACE FUNCTION check_market_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total    numeric;
  p_yes    numeric;
  p_no     numeric;
  alert    RECORD;
  p_side   numeric;
BEGIN
  -- Only proceed if pools changed
  IF NEW.pool_yes = OLD.pool_yes AND NEW.pool_no = OLD.pool_no THEN
    RETURN NEW;
  END IF;

  total := NEW.pool_yes + NEW.pool_no;
  IF total <= 0 THEN RETURN NEW; END IF;

  p_yes := (NEW.pool_yes / total) * 100;
  p_no  := (NEW.pool_no  / total) * 100;

  FOR alert IN
    SELECT * FROM market_alerts
    WHERE market_id = NEW.id
      AND NOT triggered
  LOOP
    p_side := CASE WHEN alert.side = 'YES' THEN p_yes ELSE p_no END;

    IF p_side >= alert.threshold THEN
      -- Mark as triggered
      UPDATE market_alerts
      SET triggered = true, triggered_at = now()
      WHERE id = alert.id;

      -- Insert notification for the user
      INSERT INTO notifications (user_id, kind, text, market_id)
      VALUES (
        alert.user_id,
        'alert',
        format(
          '%s chegou a %s%% no mercado "%s"',
          CASE WHEN alert.side = 'YES' THEN 'SIM' ELSE 'NÃO' END,
          round(p_side, 1),
          (SELECT question FROM markets WHERE id = NEW.id LIMIT 1)
        ),
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER market_alerts_trigger
  AFTER UPDATE OF pool_yes, pool_no ON markets
  FOR EACH ROW
  EXECUTE FUNCTION check_market_alerts();
