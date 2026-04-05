-- Add dynamic pricing to Manual Payment Configs

ALTER TABLE public.manual_payment_configs
  ADD COLUMN IF NOT EXISTS monthly_price INTEGER NOT NULL DEFAULT 99000,
  ADD COLUMN IF NOT EXISTS yearly_price INTEGER NOT NULL DEFAULT 999000;
