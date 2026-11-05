import React from 'react';
import { fmtMoeda } from '@/lib/utils'; // assume utility exists

interface Item {
  nome: string;
  quantidade?: number;
  preco?: number;
  desconto?: number;
  total?: number;
}

interface Props {
  title: string;
  items: Item[];
}

const ProcedimentoList: React.FC<Props> = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="bg-foreground/5">
            <th className="py-1 px-2 text-left">Item</th>
            <th className="py-1 px-2 text-right">Qtd</th>
            <th className="py-1 px-2 text-right">Preço</th>
            <th className="py-1 px-2 text-right">Desconto</th>
            <th className="py-1 px-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="border-b border-foreground/10">
              <td className="py-1 px-2">{it.nome}</td>
              <td className="py-1 px-2 text-right">{it.quantidade ?? 1}</td>
              <td className="py-1 px-2 text-right">{it.preco ? fmtMoeda(it.preco) : '-'} </td>
              <td className="py-1 px-2 text-right">{it.desconto ? fmtMoeda(it.desconto) : '-'} </td>
              <td className="py-1 px-2 text-right font-medium">{it.total ? fmtMoeda(it.total) : '-'} </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProcedimentoList;
