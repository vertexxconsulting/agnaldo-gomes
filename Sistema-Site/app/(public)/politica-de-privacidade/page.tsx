export default function PoliticaPrivacidadePage() {
  return (
    <div className="pt-32 pb-24 container mx-auto px-6 md:px-12 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-12 uppercase tracking-widest">
        Política de Privacidade
      </h1>
      
      <div className="prose prose-invert max-w-none text-foreground/80 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Introdução</h2>
          <p>
            O Studio Agnaldo Gomes está comprometido com a proteção da sua privacidade e dos seus dados pessoais. 
            Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações 
            fornecidas por você ao utilizar nosso site, realizar agendamentos ou adquirir cursos em nossa Academy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Coleta de Informações</h2>
          <p>Podemos coletar as seguintes informações pessoais:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Dados de identificação:</strong> Nome completo, CPF (para emissão de certificados e notas fiscais).</li>
            <li><strong>Dados de contato:</strong> E-mail e número de telefone/WhatsApp.</li>
            <li><strong>Dados de pagamento:</strong> Informações necessárias para processamento de transações em nossa Academy (intermediados por gateways de pagamento seguros).</li>
            <li><strong>Dados de navegação:</strong> Endereço IP, tipo de navegador, páginas visitadas e tempo de permanência no site, através de cookies e tecnologias semelhantes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Uso das Informações</h2>
          <p>Utilizamos suas informações para as seguintes finalidades:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Processar e confirmar agendamentos no Studio.</li>
            <li>Conceder acesso aos cursos e materiais da Academy.</li>
            <li>Enviar comunicações importantes, como confirmações, alterações de horários e emissão de certificados.</li>
            <li>Melhorar nossos serviços, personalizar sua experiência e enviar conteúdos ou ofertas relevantes (caso tenha optado por recebê-los).</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Compartilhamento de Dados</h2>
          <p>
            Não vendemos nem comercializamos seus dados pessoais. O compartilhamento ocorre apenas quando 
            necessário com parceiros confiáveis, tais como gateways de pagamento, provedores de hospedagem 
            de vídeo e sistemas de envio de e-mails, sempre exigindo a conformidade com as leis de proteção de dados vigentes (LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Segurança</h2>
          <p>
            Adotamos medidas técnicas e administrativas rigorosas para proteger seus dados contra acessos não 
            autorizados, perda, destruição ou alteração. Toda transação de pagamento é criptografada e segura.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Seus Direitos</h2>
          <p>
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar o acesso, 
            a correção, a portabilidade ou a exclusão dos seus dados pessoais armazenados em nossa base. 
            Para exercer seus direitos, entre em contato através dos nossos canais de atendimento.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">7. Contato</h2>
          <p>
            Para esclarecer quaisquer dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus 
            dados, entre em contato conosco através do nosso WhatsApp oficial ou visitando o Studio.
          </p>
        </section>

        <div className="pt-8 border-t border-white/10 text-sm text-foreground/50">
          <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}
