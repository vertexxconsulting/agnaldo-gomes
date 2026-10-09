/**
 * Layout da ÁREA DO ALUNO (academy).
 *
 * NÃO herda do Header/Footer do site institucional — a área logada do aluno
 * renderiza como um app web de gestão real (cursos, certificados, progresso). globals.css já importado pelo RootLayout.
 */
export const metadata = {
  title: 'Área do Aluno · Academy',
  description: 'Cursos online, certificados e acompanhamento de progresso — Agnaldo Gomes Academy',
};

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
