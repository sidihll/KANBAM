import React from 'react';
import { X, Printer, ShoppingBag, CheckCircle } from 'lucide-react';
import { Venda } from '../types/index.ts';
import { formatarMoeda, formatarDataHora, getFormaPagamentoLabel } from '../utils/formatters.ts';

interface ReceiptModalProps {
  venda: Venda | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ venda, isOpen, onClose }) => {
  if (!isOpen || !venda) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 print:border-none print:shadow-none my-8">
        {/* Header - Screen only */}
        <div className="bg-emerald-600 p-4 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-200" />
            <h3 className="font-semibold text-base">Comprovante de Venda</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt */}
        <div className="p-6 font-mono text-xs text-gray-800 space-y-4 print:p-2 print:text-black">
          {/* Market Logo / Info */}
          <div className="text-center pb-3 border-b border-dashed border-gray-300">
            <div className="font-bold text-base tracking-wider uppercase mb-1">
              SUPERMARKET GESTÃO
            </div>
            <div className="text-[11px] text-gray-600">SISTEMA INTEGRADO DE MERCADO</div>
            <div className="text-[10px] text-gray-500 mt-1">CUPOM NÃO FISCAL DE CONFERÊNCIA</div>
          </div>

          {/* Venda Info */}
          <div className="flex justify-between text-[11px] pb-2 border-b border-dashed border-gray-300">
            <div>
              <div><strong>VENDA:</strong> {venda.numero_venda}</div>
              {venda.cliente_nome && <div><strong>CLIENTE:</strong> {venda.cliente_nome}</div>}
              <div><strong>DATA:</strong> {formatarDataHora(venda.created_at)}</div>
            </div>
            <div className="text-right">
              <div><strong>STATUS:</strong> {venda.status === 'concluida' ? 'CONFIRMADA' : 'CANCELADA'}</div>
              <div><strong>PAGTO:</strong> {getFormaPagamentoLabel(venda.forma_pagamento)}</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-12 text-[10px] font-bold border-b border-gray-300 pb-1 text-gray-700">
              <span className="col-span-6">ITEM / DESCRIÇÃO</span>
              <span className="col-span-2 text-center">QTD</span>
              <span className="col-span-2 text-right">UNIT</span>
              <span className="col-span-2 text-right">TOTAL</span>
            </div>

            {venda.itens.map((item, idx) => (
              <div key={item.id || idx} className="grid grid-cols-12 text-[11px] py-0.5 border-b border-gray-100">
                <span className="col-span-6 truncate font-medium">{item.produto_nome}</span>
                <span className="col-span-2 text-center text-gray-600">{item.quantidade}</span>
                <span className="col-span-2 text-right text-gray-600">{formatarMoeda(item.preco_unitario)}</span>
                <span className="col-span-2 text-right font-semibold">{formatarMoeda(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t border-dashed border-gray-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatarMoeda(venda.subtotal)}</span>
            </div>
            {venda.desconto > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto concedido:</span>
                <span>- {formatarMoeda(venda.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
              <span>TOTAL A PAGAR:</span>
              <span className="text-emerald-800">{formatarMoeda(venda.total)}</span>
            </div>

            {venda.valor_pago !== undefined && venda.valor_pago > 0 && (
              <>
                <div className="flex justify-between text-[11px] text-gray-600 pt-1">
                  <span>Valor Recebido (Dinheiro):</span>
                  <span>{formatarMoeda(venda.valor_pago)}</span>
                </div>
                {venda.troco !== undefined && (
                  <div className="flex justify-between text-[11px] font-semibold text-gray-800">
                    <span>Troco:</span>
                    <span>{formatarMoeda(venda.troco)}</span>
                  </div>
                )}
              </>
            )}

            {venda.observacoes && (
              <div className="pt-2 text-[10px] text-gray-500 italic">
                Obs: {venda.observacoes}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5">
            <div>OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE.</div>
            <div>Emitido pelo SuperMarket Gestão</div>
          </div>
        </div>

        {/* Action buttons - Screen only */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cupom
          </button>
        </div>
      </div>
    </div>
  );
};
