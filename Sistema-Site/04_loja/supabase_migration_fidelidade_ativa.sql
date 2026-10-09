CREATE TABLE IF NOT EXISTS public.loja_settings (
  id integer PRIMARY KEY DEFAULT 1,
  cep_origem text DEFAULT '',
  prazo_manuseio text DEFAULT '1 dia útil',
  frete_gratis boolean DEFAULT false,
  frete_gratis_acima_de numeric DEFAULT 0.00,
  valor_motoboy numeric DEFAULT 0.00,
  valor_correios numeric DEFAULT 0.00,
  envio_automatico boolean DEFAULT false,
  envio_manual boolean DEFAULT true,
  fidelidade_ativa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.loja_settings (id, fidelidade_ativa) 
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;
