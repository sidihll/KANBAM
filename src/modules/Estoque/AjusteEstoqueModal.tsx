import React, { useState, useEffect } from 'react';
import { X, ArrowUpDown, PlusCircle, MinusCircle, Equal, AlertCircle } from 'lucide-react';
import { Produto } from '../../types/index.ts';

interface AjusteEstoqueModalProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (produtoId: string, quantidade: number, tipo: 'definir' | 'delta') => Promise<void>;
}

export const AjusteEstoqueModal: React.FC<AjusteEstoqueModalProps> = ({
  produto,
  isOpen,
  onClose,
  onConfirmar,
}) => {
  const [tipoOperacao, setTipoOperacao] = useState<'entrada' | 'saida' | 'balanco'>('entrada');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTipoOperacao('entrada');
      setQuantidade('1');
      setMotivo('');
      setErro(null);
    }
  }, [isOpen]);

  if (!isOpen || !produto) return null;

  const qtdNum = parseFloat(quantidade) || 0;
  const estoqueAtual = produto.estoque_atual;
  let novoEstoquePrevisto = estoqueAtual;

  if (tipoOperacao === 'entrada') {
    novoEstoquePrevisto = estoqueAtual + qtdNum;
  } else if (tipoOperacao === 'saida') {
    novoEstoquePrevisto = Math.max(0, estoqueAtual - qtdNum);
  } else {
    novoEstoquePrevisto = Math.max(0, qtdNum);
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qtdNum <= 0 && tipoOperacao !== 'balanco') {
      setErro('Informe uma quantidade maior que zero.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      if (tipoOperacao === 'entrada') {
        await onConfirmar(produto.id, qtdNum, 'delta');
      } else if (tipoOperacao === 'saida') {
        await onConfirmar(produto.id, -qtdNum, 'delta');
      } else {
        await onConfirmar(produto.id, qtdNum, 'definir');
      }
      onClose();
    } catch (err: any) {
      setErro(`Erro ao ajustar estoque: ${err.message || 'Falha ao processar'}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-emerald-200" />
            <h3 className="font-semibold text-base">Ajuste Rápido de Estoque</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* Product info banner */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-xs text-gray-500">Produto selecionado:</div>
            <div className="font-semibold text-sm text-gray-900 truncate">{produto.nome}</div>
            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
              <span>Estoque atual:</span>
              <span className="font-bold text-gray-900">
                {produto.estoque_atual} {produto.unidade_medida}
              </span>
            </div>
          </div>

          {/* Tipo de Operação */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoOperacao('entrada')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition cursor-pointer ${
                  tipoOperacao === 'entrada'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>+ Entrada</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoOperacao('saida')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition cursor-pointer ${
                  tipoOperacao === 'saida'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MinusCircle className="w-4 h-4 text-rose-600" />
                <span>- Saída</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoOperacao('balanco')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition cursor-pointer ${
                  tipoOperacao === 'balanco'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Equal className="w-4 h-4 text-blue-600" />
                <span>Balanço</span>
              </button>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              {tipoOperacao === 'balanco'
                ? `Novo Valor Contado (${produto.unidade_medida})`
                : `Quantidade a ${tipoOperacao === 'entrada' ? 'Adicionar' : 'Retirar'} (${produto.unidade_medida})`}
            </label>
            <input
              type="number"
              step={produto.unidade_medida === 'KG' || produto.unidade_medida === 'L' ? '0.001' : '1'}
              min="0"
              required
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              autoFocus
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Motivo / Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Chegada de fornecedor, perda, quebra, contagem de inventário"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
          </div>

          {/* Previsão do novo saldo */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <span>Novo Estoque Resultante:</span>
            <span className="font-bold text-sm text-emerald-800">
              {novoEstoquePrevisto} {produto.unidade_medida}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
