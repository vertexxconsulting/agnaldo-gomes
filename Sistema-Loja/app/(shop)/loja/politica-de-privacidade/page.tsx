'use client';

export default function PoliticaPrivacidadeLoja() {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-8 uppercase tracking-widest">
          Política de Privacidade - Loja
        </h1>
        
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Coleta de Informações</h2>
            <p>
              Coletamos informações essenciais para o processamento e envio dos seus pedidos, como nome completo, 
              CPF, endereço de entrega, telefone e e-mail. Essas informações são fornecidas ativamente por você 
              durante o processo de checkout ou criação de conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Uso das Informações</h2>
            <p>
              Suas informações são utilizadas exclusivamente para:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Processamento de pagamentos através de nossos parceiros seguros (Mercado Pago, Stripe, Asaas).</li>
              <li>Geração de etiquetas de envio e logística de entrega.</li>
              <li>Comunicação sobre o status do seu pedido.</li>
              <li>Cumprimento de obrigações fiscais e legais.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Proteção e Segurança</h2>
            <p>
              Não armazenamos os dados sensíveis do seu cartão de crédito. Todo o processamento financeiro é feito 
              em ambiente criptografado e certificado diretamente pelos gateways de pagamento. Seus dados pessoais 
              são mantidos em servidores seguros e acessados apenas por pessoal autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Compartilhamento</h2>
            <p>
              Não vendemos ou alugamos seus dados para terceiros. O compartilhamento ocorre apenas com empresas 
              parceiras estritamente necessárias para a conclusão da sua compra (transportadoras, Correios e gateways de pagamento).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Seus Direitos</h2>
            <p>
              Conforme a LGPD, você pode solicitar a qualquer momento a visualização, alteração ou exclusão dos seus 
              dados de nossa base, exceto aqueles que somos obrigados a reter por obrigações fiscais. Entre em contato 
              conosco via WhatsApp para exercer seus direitos.
            </p>
          </section>

          <div className="pt-8 mt-8 border-t border-slate-200 text-sm text-slate-500">
            <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
