-- Manual payment support: admin-managed QR config + review metadata on orders

-- 1) Payment config singleton table
CREATE TABLE IF NOT EXISTS public.manual_payment_configs (
  id              INTEGER PRIMARY KEY,
  qr_image_url    TEXT,
  bank_name       TEXT,
  account_number  TEXT,
  account_name    TEXT,
  transfer_prefix TEXT NOT NULL DEFAULT 'TALKI',
  instructions    TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep only one logical row (id=1)
INSERT INTO public.manual_payment_configs (id, transfer_prefix)
VALUES (1, 'TALKI')
ON CONFLICT (id) DO NOTHING;

-- 2) Add manual review metadata to payment orders
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS transfer_note TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_reviewed_at
  ON public.payment_orders (reviewed_at DESC);
