import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  CheckCircle,
  AlertCircle,
  Coins,
  Receipt
} from 'lucide-react';
import { FormaPagamento } from '../../types/index.ts';
import { formatarMoeda } from '../../utils/formatters.ts';

interface FinalizarVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  desconto: number;
  total: number;
  itensCount: number;
  onConfirmarVenda: (dados: {
    forma_pagamento: FormaPagamento;
    cliente_nome?: string;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }) => Promise<void>;
}

export const FinalizarVendaModal: React.FC<FinalizarVendaModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  desconto,
  total,
  itensCount,
  onConfirmarVenda,
}) => {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [valorPago, setValorPago] = useState<string>(total.toFixed(2));
  const [clienteNome, setClienteNome] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const valorPagoNum = parseFloat(valorPago) || 0;
  const trocoCalculado = formaPagamento === 'dinheiro' ? Math.max(0, valorPagoNum - total) : 0;
  const valorInsuficiente = formaPagamento === 'dinheiro' && valorPagoNum < total;

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valorInsuficiente) {
      setErro('O valor recebido em dinheiro é inferior ao total da venda.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      await onConfirmarVenda({
        forma_pagamento: formaPagamento,
        cliente_nome: clienteNome.trim() || undefined,
        valor_pago: formaPagamento === 'dinheiro' ? valorPagoNum : undefined,
        troco: formaPagamento === 'dinheiro' ? trocoCalculado : undefined,
        observacoes: observacoes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErro(`Erro ao processar venda: ${err.message || 'Falha ao gravar'}`);
    } finally {
      setSalvando(false);
    }
  };

  const opcoesPagamento: Array<{ id: FormaPagamento; label: string; icon: any; color: string }> = [
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-600' },
    { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-teal-600' },
    { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard, color: 'text-blue-600' },
    { id: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard, color: 'text-indigo-600' },
    { id: 'vale_alimentacao', label: 'Vale Alim./Ref.', icon: Wallet, color: 'text-amber-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-200" />
            <h3 className="font-semibold text-lg">Finalizar Pagamento</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmar} className="p-6 space-y-5">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* Resumo dos Valores */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal ({itensCount} {itensCount === 1 ? 'item' : 'itens'}):</span>
              <span className="font-medium text-gray-900">{formatarMoeda(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto aplicado:</span>
                <span className="font-semibold">- {formatarMoeda(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>TOTAL A RECEBER:</span>
              <span className="text-emerald-700 text-lg">{formatarMoeda(total)}</span>
            </div>
          </div>

          {/* Seleção de Forma de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {opcoesPagamento.map((op) => {
                const Icon = op.icon;
                const selecionado = formaPagamento === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setFormaPagamento(op.id);
                      if (op.id === 'dinheiro') {
                        setValorPago(total.toFixed(2));
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selecionado
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selecionado ? 'text-emerald-700' : op.color}`} />
                    <span>{op.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo de Dinheiro e Troco */}
          {formaPagamento === 'dinheiro' && (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 uppercase tracking-wider mb-1">
                    Valor Recebido (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-700">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 uppercase tracking-wider mb-1">
                    Troco a Devolver
                  </label>
                  <div className="px-3 py-2 bg-white rounded-lg border border-emerald-300 font-bold text-sm text-emerald-800 font-mono">
                    {formatarMoeda(trocoCalculado)}
                  </div>
                </div>
              </div>

              {/* Botões de atalho de notas */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-gray-500 font-medium mr-1">Atalhos:</span>
                {[total, 20, 50, 100, 200].map((val) => {
                  if (val < total && val !== total) return null;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setValorPago(val.toFixed(2))}
                      className="px-2 py-0.5 text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 rounded text-emerald-900 font-medium cursor-pointer"
                    >
                      {formatarMoeda(val)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dados Adicionais (Cliente & Obs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Nome do Cliente (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Observações
              </label>
              <input
                type="text"
                placeholder="Ex: Entrega, CPF na nota, etc."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Voltar ao Caixa
            </button>
            <button
              type="submit"
              disabled={salvando || valorInsuficiente}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{salvando ? 'Finalizando...' : 'Confirmar e Concluir Venda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
