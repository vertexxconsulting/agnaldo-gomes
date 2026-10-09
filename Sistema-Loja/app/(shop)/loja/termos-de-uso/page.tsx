'use client';

export default function TermosUsoLoja() {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-8 uppercase tracking-widest">
          Termos de Uso e Compras - Loja
        </h1>
        
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Condições Gerais</h2>
            <p>
              Ao realizar uma compra na loja online de Agnaldo Gomes, você concorda com as condições e termos aqui 
              descritos. Os produtos oferecidos são destinados a uso final, profissional ou pessoal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Prazos e Entregas</h2>
            <p>
              O prazo de entrega informado no momento do checkout é uma estimativa fornecida pelas transportadoras 
              (Correios, Jadlog, etc). O processamento interno e a postagem do pedido ocorrem em até 2 dias úteis 
              após a confirmação do pagamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Trocas e Devoluções</h2>
            <p>
              De acordo com o Código de Defesa do Consumidor, o cliente tem o direito de arrependimento da compra em 
              até 7 dias corridos após o recebimento do produto. O produto deve ser devolvido em sua embalagem original, 
              inviolada, sem indícios de uso ou consumo. Os custos de frete reverso para trocas (exceto por defeito) 
              são de responsabilidade do cliente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Produtos Defeituosos</h2>
            <p>
              Se você identificar qualquer irregularidade ou defeito no produto recebido, por favor, entre em contato 
              conosco via WhatsApp no prazo de até 30 dias corridos para que possamos analisar o caso e providenciar 
              a substituição ou reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Promoções e Cupons</h2>
            <p>
              Ofertas, promoções e cupons de desconto não são cumulativos e possuem prazos de validade determinados. 
              Reservamo-nos o direito de cancelar ou modificar promoções sem aviso prévio.
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
