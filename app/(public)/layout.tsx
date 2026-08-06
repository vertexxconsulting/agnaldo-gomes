import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/**
 * Layout das ROTAS PÚBLICAS (institucional light).
 * Envolve /, /contato, /studio, /sobre com Header + Footer.
 * Sistema (academy, login, admin, aluno...) usa layouts próprios sem navegação institucional.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col pt-[80px]">
        {children}
      </main>
      <Footer />
    </>
  );
}
