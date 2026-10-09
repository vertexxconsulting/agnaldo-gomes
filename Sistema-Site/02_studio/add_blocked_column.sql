-- Execute este SQL no SQL Editor do seu painel do Supabase
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
