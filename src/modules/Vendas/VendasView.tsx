import React, { useState } from 'react';
import { ShoppingBag, History, Plus } from 'lucide-react';
import { Produto, Venda, FormaPagamento } from '../../types/index.ts';
import { PdvView } from './PdvView.tsx';
import { HistoricoVendasView } from './HistoricoVendasView.tsx';

interface VendasViewProps {
  produtos: Produto[];
  vendas: Venda[];
  onRegistrarVenda: (dados: {
    cliente_nome?: string;
    forma_pagamento: FormaPagamento;
    subtotal: number;
    desconto: number;
    total: number;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
    itens: Array<{
      produto_id: string;
      produto_nome: string;
      quantidade: number;
      preco_unitario: number;
      preco_custo_unitario: number;
      subtotal: number;
    }>;
  }) => Promise<Venda>;
  onCancelarVenda: (vendaId: string) => Promise<void>;
  onVerRecibo: (venda: Venda) => void;
  onIrParaEstoque: () => void;
}

export const VendasView: React.FC<VendasViewProps> = ({
  produtos,
  vendas,
  onRegistrarVenda,
  onCancelarVenda,
  onVerRecibo,
  onIrParaEstoque,
}) => {
  const [subAba, setSubAba] = useState<'pdv' | 'historico'>('pdv');

  return (
    <div className="space-y-6">
      {/* Sub Tabs Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Módulo de Vendas</h1>
          <p className="text-xs text-gray-500">
            Frente de caixa rápida (PDV) com cálculo de troco, emissão de cupom e histórico de transações.
          </p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setSubAba('pdv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              subAba === 'pdv'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Frente de Caixa (PDV)</span>
          </button>

          <button
            onClick={() => setSubAba('historico')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              subAba === 'historico'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>Histórico ({vendas.length})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Sub-Aba */}
      {subAba === 'pdv' ? (
        <PdvView
          produtos={produtos}
          onRegistrarVenda={onRegistrarVenda}
          onVendaConcluida={onVerRecibo}
          onIrParaEstoque={onIrParaEstoque}
        />
      ) : (
        <HistoricoVendasView
          vendas={vendas}
          onCancelarVenda={onCancelarVenda}
          onVerRecibo={onVerRecibo}
          onIrParaPdv={() => setSubAba('pdv')}
        />
      )}
    </div>
  );
};
