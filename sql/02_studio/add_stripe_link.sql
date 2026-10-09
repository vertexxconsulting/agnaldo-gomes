-- Execute este SQL no SQL Editor do seu painel do Supabase
ALTER TABLE courses ADD COLUMN IF NOT EXISTS stripe_payment_link text;
