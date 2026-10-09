'use client';

export default function SobrePrecosLoja() {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-8 uppercase tracking-widest">
          Sobre os Preços e Formas de Pagamento
        </h1>
        
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Transparência nos Valores</h2>
            <p>
              Na loja Agnaldo Gomes, buscamos oferecer as melhores linhas de produtos capilares profissionais e home-care 
              com total transparência. Nossos preços já incluem os impostos devidos (ICMS, IPI, etc), garantindo que 
              você não terá surpresas fiscais após a compra.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Custos de Frete</h2>
            <p>
              O valor do frete não está embutido no preço do produto. Ele é calculado de forma dinâmica durante o checkout, 
              baseado no peso cubado dos itens e no CEP de destino, buscando a melhor tarifa diretamente com as transportadoras 
              (Melhor Envio) ou Correios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Formas de Pagamento Aceitas</h2>
            <p>
              Disponibilizamos opções flexíveis para sua comodidade, processadas de forma 100% segura pelo Mercado Pago 
              e outras plataformas homologadas:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Cartão de Crédito:</strong> Pagamento em até 12x (consulte a taxa de juros do parcelamento no checkout).</li>
              <li><strong>PIX:</strong> Confirmação instantânea e, frequentemente, com descontos especiais (se houver promoção ativa).</li>
              <li><strong>Boleto Bancário:</strong> A confirmação de pagamento por boleto pode levar de 1 a 3 dias úteis. O pedido só será separado e enviado após a compensação bancária.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Alteração de Preços</h2>
            <p>
              Os preços dos produtos podem sofrer alterações a qualquer momento sem aviso prévio, motivadas por mudanças 
              no custo de fornecedores ou repasses tributários. O valor válido será sempre aquele vigente no momento 
              exato da finalização do seu carrinho. Produtos adicionados ao carrinho não garantem reserva de preço 
              caso a compra não seja concluída.
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
