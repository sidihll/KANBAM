import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  XCircle,
  CheckCircle,
  Eye,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Venda } from '../../types/index.ts';
import {
  formatarMoeda,
  formatarDataHora,
  getFormaPagamentoLabel
} from '../../utils/formatters.ts';

interface HistoricoVendasViewProps {
  vendas: Venda[];
  onCancelarVenda: (vendaId: string) => Promise<void>;
  onVerRecibo: (venda: Venda) => void;
  onIrParaPdv: () => void;
}

export const HistoricoVendasView: React.FC<HistoricoVendasViewProps> = ({
  vendas,
  onCancelarVenda,
  onVerRecibo,
  onIrParaPdv,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroPagamento, setFiltroPagamento] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroData, setFiltroData] = useState('todos');

  // Filtragem
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        v.numero_venda.toLowerCase().includes(termo) ||
        (v.cliente_nome && v.cliente_nome.toLowerCase().includes(termo)) ||
        v.itens.some((it) => it.produto_nome.toLowerCase().includes(termo));

      const matchPagto = filtroPagamento === 'todos' || v.forma_pagamento === filtroPagamento;
      const matchStatus = filtroStatus === 'todos' || v.status === filtroStatus;

      let matchData = true;
      if (filtroData !== 'todos') {
        const dataVenda = new Date(v.created_at);
        const agora = new Date();
        if (filtroData === 'hoje') {
          matchData = dataVenda.toDateString() === agora.toDateString();
        } else if (filtroData === '7dias') {
          const seteDiasAtras = new Date();
          seteDiasAtras.setDate(agora.getDate() - 7);
          matchData = dataVenda >= seteDiasAtras;
        } else if (filtroData === 'mes') {
          matchData =
            dataVenda.getMonth() === agora.getMonth() &&
            dataVenda.getFullYear() === agora.getFullYear();
        }
      }

      return matchBusca && matchPagto && matchStatus && matchData;
    });
  }, [vendas, busca, filtroPagamento, filtroStatus, filtroData]);

  // Totais do histórico filtrado
  const totalFaturado = useMemo(() => {
    return vendasFiltradas
      .filter((v) => v.status === 'concluida')
      .reduce((acc, v) => acc + v.total, 0);
  }, [vendasFiltradas]);

  const handleCancelar = async (venda: Venda) => {
    if (venda.status === 'cancelada') return;
    if (
      confirm(
        `Tem certeza de que deseja cancelar a venda ${venda.numero_venda}?\nOs itens comprados serão devolvidos ao estoque automaticamente.`
      )
    ) {
      await onCancelarVenda(venda.id);
    }
  };

  const handleExportarCsv = () => {
    if (vendas.length === 0) return;

    const cabecalho = [
      'Numero Venda',
      'Data/Hora',
      'Cliente',
      'Forma Pagamento',
      'Itens',
      'Subtotal',
      'Desconto',
      'Total',
      'Status',
    ];

    const linhas = vendas.map((v) => {
      const descricaoItens = v.itens.map((it) => `${it.quantidade}x ${it.produto_nome}`).join(' | ');
      return [
        v.numero_venda,
        `"${formatarDataHora(v.created_at)}"`,
        `"${v.cliente_nome || 'Consumidor'}"`,
        getFormaPagamentoLabel(v.forma_pagamento),
        `"${descricaoItens}"`,
        v.subtotal.toFixed(2),
        v.desconto.toFixed(2),
        v.total.toFixed(2),
        v.status,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [cabecalho.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendas_supermercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar com Totais e Botões */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Total do Período Filtrado
          </span>
          <div className="text-xl font-extrabold text-emerald-800 font-mono">
            {formatarMoeda(totalFaturado)}
          </div>
          <span className="text-[11px] text-gray-400">
            {vendasFiltradas.filter((v) => v.status === 'concluida').length} vendas concluídas
          </span>
        </div>

        <div className="flex items-center gap-2">
          {vendas.length > 0 && (
            <button
              onClick={handleExportarCsv}
              className="px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Exportar Vendas</span>
            </button>
          )}

          <button
            onClick={onIrParaPdv}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm cursor-pointer"
          >
            Abrir Frente de Caixa
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Nº da venda, cliente ou produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
          </div>

          {/* Filtro Período */}
          <div>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="todos">Todo o Período</option>
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="mes">Este Mês</option>
            </select>
          </div>

          {/* Filtro Pagamento */}
          <div>
            <select
              value={filtroPagamento}
              onChange={(e) => setFiltroPagamento(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="todos">Todas Formas Pagto</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="vale_alimentacao">Vale Alim./Ref.</option>
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="todos">Todos Status</option>
              <option value="concluida">Concluídas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Vendas ou Estado Vazio */}
      {vendas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhuma venda registrada ainda</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
            O histórico exibe apenas as vendas que você registrar no sistema. Abra a Frente de Caixa (PDV)
            para efetuar sua primeira venda.
          </p>
          <button
            onClick={onIrParaPdv}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <span>Ir para Frente de Caixa (PDV)</span>
          </button>
        </div>
      ) : vendasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <p className="text-xs text-gray-500">Nenhuma venda encontrada com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Venda / Data</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Forma Pagto</th>
                  <th className="py-3 px-4">Itens Comprados</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendasFiltradas.map((venda) => {
                  const isCancelada = venda.status === 'cancelada';

                  return (
                    <tr
                      key={venda.id}
                      className={`hover:bg-gray-50/60 transition-colors ${
                        isCancelada ? 'opacity-60 bg-gray-50/40' : ''
                      }`}
                    >
                      {/* Venda e Data */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-gray-900">{venda.numero_venda}</div>
                        <div className="text-[11px] text-gray-500 font-sans">
                          {formatarDataHora(venda.created_at)}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-800">
                          {venda.cliente_nome || 'Consumidor'}
                        </span>
                      </td>

                      {/* Pagamento */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[11px] font-medium">
                          {getFormaPagamentoLabel(venda.forma_pagamento)}
                        </span>
                      </td>

                      {/* Itens */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-[11px] text-gray-700 font-medium">
                          {venda.itens.length} {venda.itens.length === 1 ? 'item' : 'itens'}:
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {venda.itens.map((it) => `${it.quantidade}x ${it.produto_nome}`).join(', ')}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <div className={isCancelada ? 'line-through text-gray-400' : 'text-gray-900'}>
                          {formatarMoeda(venda.total)}
                        </div>
                        {venda.desconto > 0 && (
                          <div className="text-[10px] text-emerald-600 font-sans">
                            Desc: -{formatarMoeda(venda.desconto)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isCancelada
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isCancelada ? (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Cancelada
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Concluída
                            </>
                          )}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onVerRecibo(venda)}
                            title="Visualizar ou Imprimir Comprovante"
                            className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!isCancelada && (
                            <button
                              onClick={() => handleCancelar(venda)}
                              title="Cancelar Venda e Devolver Itens ao Estoque"
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
            Mostrando <strong>{vendasFiltradas.length}</strong> de <strong>{vendas.length}</strong> vendas
          </div>
        </div>
      )}
    </div>
  );
};
