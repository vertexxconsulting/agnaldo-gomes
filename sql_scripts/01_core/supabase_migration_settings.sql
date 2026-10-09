CREATE TABLE IF NOT EXISTS salon_system_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO salon_system_settings (key, value) VALUES
('msg_confirmacao', 'Olá {{nome}}, seu horário para {{servico}} no Studio Agnaldo Gomes está marcado para {{data}} às {{hora}}. Responda SIM para confirmar.'),
('msg_lembrete', 'Oi, {{nome}}! ⏰ Seu horário é HOJE às {{hora}} para {{servico}}. Estamos te esperando!'),
('msg_feedback', 'Oi, {{nome}}! 😍 Como está ficando o resultado do seu {{servico}}? Sua opinião vale ouro para nós: responda com uma nota de 0 a 10.'),
('msg_aniversario', '🌸 Feliz Aniversário, {{nome}}! 🎂 A equipe Agnaldo Gomes Studio deseja que este dia seja tão especial quanto você.'),
('msg_reativacao', 'Oi, {{nome}}! ✨ Sentimos sua falta no Agnaldo Gomes Studio — já faz {{tempo}} desde seu último cuidado. Que tal reservar um momento só seu?')
ON CONFLICT (key) DO NOTHING;
