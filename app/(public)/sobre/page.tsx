import { SectionTitle } from "@/components/SectionTitle";
import Image from "next/image";

export default function SobrePage() {
  return (
    <div className="flex flex-col w-full py-20">
      <div className="container mx-auto px-6">
        <SectionTitle title="Sobre a Marca" subtitle="História e Propósito" align="center" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-16">
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-bold text-gradient">Nossa Missão</h3>
            <p className="text-foreground/80 text-base leading-relaxed">
              Levar a arte do visagismo e da beleza a um novo patamar, entregando não apenas resultados estéticos impecáveis, mas promovendo a autoconfiança e a transformação real na vida de nossos clientes e alunos.
            </p>
            
            <h3 className="text-2xl font-bold text-gradient mt-8">Visão e Valores</h3>
            <p className="text-foreground/80 text-base leading-relaxed">
              Ser a principal referência em beleza premium e educação profissionalizante do país. Nossos valores inegociáveis incluem a excelência, o cuidado genuíno com os detalhes, inovação constante e respeito à individualidade.
            </p>
          </div>
          
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl glass p-2 border-primary/20">
             <div className="relative w-full h-full rounded-2xl overflow-hidden">
               <Image
                 src="/logo-studio.png"
                 alt="Marca Agnaldo Gomes"
                 fill
                 className="object-cover opacity-80 mix-blend-screen"
               />
               <div className="absolute inset-0 bg-background/40" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
