import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Calendar,
  CreditCard,
  Award,
  Package,
  ArrowUpRight,
  Download,
  Plus,
  ShoppingBag,
  Percent,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { Produto, Venda } from '../../types/index.ts';
import {
  formatarMoeda,
  formatarNumero,
  formatarDataSimples,
  getFormaPagamentoLabel
} from '../../utils/formatters.ts';

interface DashboardViewProps {
  produtos: Produto[];
  vendas: Venda[];
  onIrParaEstoque: () => void;
  onIrParaPdv: () => void;
  onCadastrarProduto: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  produtos,
  vendas,
  onIrParaEstoque,
  onIrParaPdv,
  onCadastrarProduto,
}) => {
  const [periodoFiltro, setPeriodoFiltro] = useState<'hoje' | '7dias' | '30dias' | 'todos'>('todos');

  // Filtragem de vendas por período selecionado
  const vendasFiltradas = useMemo(() => {
    const agora = new Date();
    return vendas.filter((v) => {
      if (v.status !== 'concluida') return false;
      const dataVenda = new Date(v.created_at);

      if (periodoFiltro === 'hoje') {
        return dataVenda.toDateString() === agora.toDateString();
      }
      if (periodoFiltro === '7dias') {
        const d = new Date();
        d.setDate(agora.getDate() - 7);
        return dataVenda >= d;
      }
      if (periodoFiltro === '30dias') {
        const d = new Date();
        d.setDate(agora.getDate() - 30);
        return dataVenda >= d;
      }
      return true; // 'todos'
    });
  }, [vendas, periodoFiltro]);

  // Cálculos financeiros e de lucratividade
  const metricasFinanceiras = useMemo(() => {
    let faturamentoTotal = 0;
    let custoTotalVendido = 0;
    let totalDescontos = 0;

    vendasFiltradas.forEach((v) => {
      faturamentoTotal += v.total;
      totalDescontos += v.desconto;

      v.itens.forEach((it) => {
        custoTotalVendido += (it.preco_custo_unitario || 0) * it.quantidade;
      });
    });

    const lucroBruto = faturamentoTotal - custoTotalVendido;
    const margemMedia = faturamentoTotal > 0 ? (lucroBruto / faturamentoTotal) * 100 : 0;
    const ticketMedio = vendasFiltradas.length > 0 ? faturamentoTotal / vendasFiltradas.length : 0;

    // Métricas de estoque
    let valorEstoqueCusto = 0;
    let valorEstoqueVenda = 0;
    let produtosBaixoEstoque = 0;
    let produtosEsgotados = 0;

    produtos.forEach((p) => {
      const qtd = p.estoque_atual || 0;
      valorEstoqueCusto += qtd * p.preco_custo;
      valorEstoqueVenda += qtd * p.preco_venda;

      if (qtd <= 0) {
        produtosEsgotados++;
      } else if (qtd <= p.estoque_minimo) {
        produtosBaixoEstoque++;
      }
    });

    return {
      faturamentoTotal,
      lucroBruto,
      margemMedia,
      ticketMedio,
      totalVendas: vendasFiltradas.length,
      totalDescontos,
      valorEstoqueCusto,
      valorEstoqueVenda,
      produtosBaixoEstoque,
      produtosEsgotados,
      totalProdutosCadastrados: produtos.length,
    };
  }, [vendasFiltradas, produtos]);

  // Vendas por Forma de Pagamento
  const vendasPorPagamento = useMemo(() => {
    const mapa: Record<string, { total: number; count: number }> = {};

    vendasFiltradas.forEach((v) => {
      if (!mapa[v.forma_pagamento]) {
        mapa[v.forma_pagamento] = { total: 0, count: 0 };
      }
      mapa[v.forma_pagamento].total += v.total;
      mapa[v.forma_pagamento].count += 1;
    });

    return Object.entries(mapa).map(([forma, dados]) => ({
      forma,
      label: getFormaPagamentoLabel(forma),
      total: dados.total,
      count: dados.count,
      percentual:
        metricasFinanceiras.faturamentoTotal > 0
          ? (dados.total / metricasFinanceiras.faturamentoTotal) * 100
          : 0,
    })).sort((a, b) => b.total - a.total);
  }, [vendasFiltradas, metricasFinanceiras.faturamentoTotal]);

  // Top 5 Produtos Mais Vendidos
  const topProdutos = useMemo(() => {
    const mapa: Record<string, { nome: string; quantidade: number; receita: number }> = {};

    vendasFiltradas.forEach((v) => {
      v.itens.forEach((it) => {
        if (!mapa[it.produto_id]) {
          mapa[it.produto_id] = { nome: it.produto_nome, quantidade: 0, receita: 0 };
        }
        mapa[it.produto_id].quantidade += it.quantidade;
        mapa[it.produto_id].receita += it.subtotal;
      });
    });

    return Object.values(mapa)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasFiltradas]);

  // Vendas por data (Agrupamento diário para o gráfico)
  const vendasPorDia = useMemo(() => {
    const mapa: Record<string, number> = {};

    vendasFiltradas.forEach((v) => {
      const dataFormatada = formatarDataSimples(v.created_at);
      mapa[dataFormatada] = (mapa[dataFormatada] || 0) + v.total;
    });

    // Pega as últimas 10 datas com vendas
    return Object.entries(mapa)
      .map(([data, total]) => ({ data, total }))
      .slice(-10);
  }, [vendasFiltradas]);

  // Produtos com Estoque Crítico
  const produtosCriticos = useMemo(() => {
    return produtos
      .filter((p) => p.estoque_atual <= p.estoque_minimo)
      .sort((a, b) => a.estoque_atual - b.estoque_atual)
      .slice(0, 6);
  }, [produtos]);

  const valorMaxGrafico = useMemo(() => {
    if (vendasPorDia.length === 0) return 100;
    return Math.max(...vendasPorDia.map((d) => d.total), 10);
  }, [vendasPorDia]);

  const handleExportarRelatorio = () => {
    const linhas = [
      ['RELATORIO CONSOLIDADO DE GESTAO - SUPERMERCADO'],
      ['Data de Emissao:', new Date().toLocaleString('pt-BR')],
      ['Periodo Filtrado:', periodoFiltro.toUpperCase()],
      [''],
      ['INDICADORES PRINCIPAIS'],
      ['Faturamento Total:', formatarMoeda(metricasFinanceiras.faturamentoTotal)],
      ['Lucro Bruto Estimado:', formatarMoeda(metricasFinanceiras.lucroBruto)],
      ['Margem Media:', `${metricasFinanceiras.margemMedia.toFixed(2)}%`],
      ['Total de Vendas:', metricasFinanceiras.totalVendas.toString()],
      ['Ticket Medio:', formatarMoeda(metricasFinanceiras.ticketMedio)],
      ['Valor do Estoque (Custo):', formatarMoeda(metricasFinanceiras.valorEstoqueCusto)],
      ['Valor do Estoque (Venda):', formatarMoeda(metricasFinanceiras.valorEstoqueVenda)],
      [''],
      ['VENDAS POR FORMA DE PAGAMENTO'],
      ['Forma', 'Qtd Transacoes', 'Total (R$)', 'Percentual (%)'],
      ...vendasPorPagamento.map((p) => [
        p.label,
        p.count.toString(),
        p.total.toFixed(2),
        `${p.percentual.toFixed(1)}%`,
      ]),
      [''],
      ['TOP PRODUTOS MAIS VENDIDOS'],
      ['Produto', 'Qtd Vendida', 'Receita Total (R$)'],
      ...topProdutos.map((p) => [p.nome, p.quantidade.toString(), p.receita.toFixed(2)]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      linhas.map((e) => e.map((cell) => `"${cell}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Se o usuário ainda não cadastrou nada
  const estaVazio = produtos.length === 0 && vendas.length === 0;

  if (estaVazio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard de Relatórios</h1>
          <p className="text-xs text-gray-500">
            Visão gerencial consolidada e indicadores em tempo real.
          </p>
        </div>

        {/* Empty state zero-mock-data */}
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Painel de Relatórios Aguardando Dados
          </h3>
          <p className="text-xs text-gray-500 max-w-lg mx-auto mb-6 leading-relaxed">
            Como você solicitou, nenhum dado de exemplo foi criado. Todas as métricas, relatórios de
            faturamento, margem de lucro, curva de vendas e controle de estoque serão calculados
            automaticamente assim que você cadastrar produtos e realizar vendas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onCadastrarProduto}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
            <button
              onClick={onIrParaPdv}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Abrir Frente de Caixa (PDV)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard & Relatórios</h1>
          <p className="text-xs text-gray-500">
            Acompanhe o faturamento, margem de lucro e desempenho do estoque cadastrado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Período Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => setPeriodoFiltro('hoje')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                periodoFiltro === 'hoje' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-gray-600'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFiltro('7dias')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                periodoFiltro === '7dias' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-gray-600'
              }`}
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFiltro('30dias')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                periodoFiltro === '30dias' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-gray-600'
              }`}
            >
              30 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFiltro('todos')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                periodoFiltro === 'todos' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-gray-600'
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={handleExportarRelatorio}
            className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">
            {formatarMoeda(metricasFinanceiras.faturamentoTotal)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
            <span className="font-semibold text-emerald-700">{metricasFinanceiras.totalVendas}</span>
            <span>vendas registradas no período</span>
          </div>
        </div>

        {/* Lucro Bruto Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lucro Bruto Estimado</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700 font-mono">
            {formatarMoeda(metricasFinanceiras.lucroBruto)}
          </div>
          <div className="text-[11px] text-teal-800 mt-2 font-semibold">
            Margem real de {metricasFinanceiras.margemMedia.toFixed(1)}% sobre as vendas
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">
            {formatarMoeda(metricasFinanceiras.ticketMedio)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Gasto médio por cliente/compra
          </div>
        </div>

        {/* Patrimônio em Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Patrimônio em Estoque</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono truncate">
            {formatarMoeda(metricasFinanceiras.valorEstoqueVenda)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Custo: {formatarMoeda(metricasFinanceiras.valorEstoqueCusto)} ({metricasFinanceiras.totalProdutosCadastrados} itens)
          </div>
        </div>
      </div>

      {/* Gráfico de Faturamento por Data & Distribuição por Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Barras por Dia - 7 colunas */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Evolução de Vendas por Período</h3>
              <p className="text-[11px] text-gray-500">Valores faturados diariamente nas datas cadastradas</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Tempo Real
            </span>
          </div>

          {vendasPorDia.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              Nenhuma venda registrada no período selecionado.
            </div>
          ) : (
            <div className="pt-4">
              <div className="flex items-end justify-between gap-2 h-44 border-b border-gray-200 pb-2">
                {vendasPorDia.map((item, idx) => {
                  const alturaPercent = Math.max(8, (item.total / valorMaxGrafico) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      {/* Tooltip on hover */}
                      <div className="text-[10px] font-mono text-gray-700 font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-gray-100 px-1 rounded shadow-xs">
                        {formatarMoeda(item.total)}
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${alturaPercent}%` }}
                        className="w-full max-w-[42px] bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-md hover:from-emerald-500 hover:to-teal-400 transition cursor-pointer relative"
                      />

                      {/* Date label */}
                      <span className="text-[10px] text-gray-500 truncate max-w-[50px] font-mono">
                        {item.data.slice(0, 5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Vendas por Forma de Pagamento - 5 colunas */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Formas de Pagamento</h3>
            <p className="text-[11px] text-gray-500">Distribuição do faturamento por modalidade</p>
          </div>

          {vendasPorPagamento.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              Nenhum dado de pagamento registrado ainda.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {vendasPorPagamento.map((p) => (
                <div key={p.forma} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">{p.label}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 font-mono mr-1.5">
                        {formatarMoeda(p.total)}
                      </span>
                      <span className="text-[11px] text-gray-500">({p.percentual.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${p.percentual}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Seção Inferior: Top Produtos & Alertas de Reposição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 Produtos Mais Vendidos - 6 colunas */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Top Produtos Mais Vendidos</h3>
            </div>
            <button
              onClick={onIrParaPdv}
              className="text-[11px] text-emerald-600 hover:underline font-semibold cursor-pointer"
            >
              Frente de Caixa
            </button>
          </div>

          {topProdutos.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              Nenhum item vendido ainda para exibir no ranking.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topProdutos.map((prod, index) => (
                <div key={index} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800'
                          : index === 1
                          ? 'bg-gray-200 text-gray-800'
                          : index === 2
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">{prod.nome}</span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-gray-900 font-mono">
                      {formatarMoeda(prod.receita)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {prod.quantidade} unidades vendidas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerta de Reposição de Estoque - 6 colunas */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900">Alerta de Reposição de Estoque</h3>
            </div>
            <button
              onClick={onIrParaEstoque}
              className="text-[11px] text-emerald-600 hover:underline font-semibold cursor-pointer"
            >
              Ver Todo Estoque
            </button>
          </div>

          {produtosCriticos.length === 0 ? (
            <div className="py-8 text-center text-emerald-700 text-xs bg-emerald-50/50 rounded-xl p-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
              <div className="font-semibold">Nenhum produto em nível crítico!</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">
                Todos os produtos cadastrados estão com estoque acima do limite mínimo.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {produtosCriticos.map((p) => {
                const zerado = p.estoque_atual <= 0;
                return (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-gray-900">{p.nome}</div>
                      <div className="text-[10px] text-gray-500">
                        {p.categoria} &bull; Mínimo exigido: {p.estoque_minimo} {p.unidade_medida}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        zerado ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {zerado ? 'Esgotado' : `${p.estoque_atual} ${p.unidade_medida}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
