export default function TermosUsoPage() {
  return (
    <div className="pt-32 pb-24 container mx-auto px-6 md:px-12 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-12 uppercase tracking-widest">
        Termos de Uso
      </h1>
      
      <div className="prose prose-invert max-w-none text-foreground/80 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar os serviços do site e sistemas do Studio Agnaldo Gomes e da Agnaldo Gomes Academy, 
            você concorda expressamente com estes Termos de Uso. Caso não concorde com qualquer disposição 
            aqui presente, solicitamos que interrompa o uso de nossas plataformas.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Agendamentos no Studio</h2>
          <p>
            Ao realizar um agendamento através do nosso site, você compreende que o horário está sujeito à 
            confirmação pela nossa equipe. Solicitamos que cancelamentos ou alterações sejam comunicados 
            com, no mínimo, 24 horas de antecedência para evitar prejuízos à agenda do profissional.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Acesso à Academy (Cursos Online)</h2>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Uso Pessoal e Intransferível:</strong> O acesso aos cursos é exclusivo do aluno matriculado. É estritamente proibido compartilhar senhas ou ratear assinaturas com terceiros.</li>
            <li><strong>Propriedade Intelectual:</strong> Todo o conteúdo, incluindo vídeos, apostilas e métodos ensinados, são de propriedade intelectual exclusiva de Agnaldo Gomes. A reprodução, venda ou distribuição não autorizada constitui violação de direitos autorais, sujeita a medidas legais cabíveis.</li>
            <li><strong>Certificados:</strong> O certificado de conclusão será emitido exclusivamente em nome do aluno cadastrado após a conclusão de 100% da carga horária das aulas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Conduta do Usuário e Comunidade</h2>
          <p>
            Na comunidade da Academy, não será tolerada linguagem abusiva, desrespeitosa ou a promoção de 
            conteúdos não relacionados ao curso. Reservamo-nos o direito de suspender ou cancelar, sem aviso 
            prévio e sem reembolso, o acesso de usuários que violem as normas de respeito e boa convivência.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Política de Reembolso</h2>
          <p>
            Em conformidade com o Código de Defesa do Consumidor, o aluno tem o direito de arrependimento e 
            poderá solicitar o cancelamento e reembolso integral da compra de cursos online no prazo de até 
            7 (sete) dias corridos após a confirmação do pagamento, desde que a solicitação seja feita através 
            dos canais oficiais de atendimento.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Modificações dos Termos</h2>
          <p>
            Estes Termos de Uso podem ser alterados periodicamente para refletir mudanças em nossos serviços 
            ou atualizações legais. Recomendamos que consulte esta página regularmente para se manter informado.
          </p>
        </section>

        <div className="pt-8 border-t border-white/10 text-sm text-foreground/50">
          <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}
