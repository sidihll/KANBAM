import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  ArrowUpDown,
  Download,
  Barcode,
  PackageCheck,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Produto } from '../../types/index.ts';
import { formatarMoeda, formatarNumero } from '../../utils/formatters.ts';
import { ProdutoFormModal } from './ProdutoFormModal.tsx';
import { AjusteEstoqueModal } from './AjusteEstoqueModal.tsx';

interface EstoqueViewProps {
  produtos: Produto[];
  onSalvarProduto: (produto: Omit<Produto, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onAjustarEstoque: (produtoId: string, quantidade: number, tipo: 'definir' | 'delta') => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
  isModalNovoAberto: boolean;
  setIsModalNovoAberto: (aberto: boolean) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  produtos,
  onSalvarProduto,
  onAjustarEstoque,
  onExcluirProduto,
  isModalNovoAberto,
  setIsModalNovoAberto,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ok' | 'baixo' | 'zerado'>('todos');
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [produtoAjustando, setProdutoAjustando] = useState<Produto | null>(null);
  const [idExcluindo, setIdExcluindo] = useState<string | null>(null);

  // Categorias únicas presentes ou padrão
  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set<string>();
    produtos.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats);
  }, [produtos]);

  // Métricas do estoque
  const metricas = useMemo(() => {
    let totalItens = produtos.length;
    let estoqueBaixo = 0;
    let esgotados = 0;
    let valorCustoTotal = 0;
    let valorVendaTotal = 0;

    produtos.forEach((p) => {
      const qtd = p.estoque_atual || 0;
      const min = p.estoque_minimo || 0;

      if (qtd <= 0) {
        esgotados++;
      } else if (qtd <= min) {
        estoqueBaixo++;
      }

      valorCustoTotal += qtd * (p.preco_custo || 0);
      valorVendaTotal += qtd * (p.preco_venda || 0);
    });

    return {
      totalItens,
      estoqueBaixo,
      esgotados,
      valorCustoTotal,
      valorVendaTotal,
      lucroProjetado: valorVendaTotal - valorCustoTotal,
    };
  }, [produtos]);

  // Lista filtrada
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termo)) ||
        (p.categoria && p.categoria.toLowerCase().includes(termo));

      const matchCategoria = filtroCategoria === 'todas' || p.categoria === filtroCategoria;

      let matchStatus = true;
      if (filtroStatus === 'zerado') {
        matchStatus = p.estoque_atual <= 0;
      } else if (filtroStatus === 'baixo') {
        matchStatus = p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo;
      } else if (filtroStatus === 'ok') {
        matchStatus = p.estoque_atual > p.estoque_minimo;
      }

      return matchBusca && matchCategoria && matchStatus;
    });
  }, [produtos, busca, filtroCategoria, filtroStatus]);

  const handleExportarCsv = () => {
    if (produtos.length === 0) return;

    const cabecalho = ['ID', 'Nome', 'Codigo de Barras', 'Categoria', 'Unidade', 'Preco Custo', 'Preco Venda', 'Estoque Atual', 'Estoque Minimo'];
    const linhas = produtos.map((p) => [
      p.id,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.codigo_barras || ''}"`,
      `"${p.categoria}"`,
      p.unidade_medida,
      p.preco_custo.toFixed(2),
      p.preco_venda.toFixed(2),
      p.estoque_atual,
      p.estoque_minimo,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [cabecalho.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estoque_supermercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmarExclusao = async (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este produto do estoque?')) {
      await onExcluirProduto(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Módulo de Estoque</h1>
          <p className="text-xs text-gray-500">
            Cadastre, controle e acompanhe todos os produtos e níveis de inventário do supermercado.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {produtos.length > 0 && (
            <button
              onClick={handleExportarCsv}
              className="px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Exportar CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total de Itens</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{metricas.totalItens}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Produtos no catálogo</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Estoque Crítico</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600">
            {metricas.estoqueBaixo}
            {metricas.esgotados > 0 && (
              <span className="text-xs text-rose-500 font-normal ml-1">({metricas.esgotados} zerados)</span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Abaixo do estoque mínimo</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Valor em Custo</span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            {formatarMoeda(metricas.valorCustoTotal)}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Investimento atual em estoque</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Projeção de Venda</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-700 truncate">
            {formatarMoeda(metricas.valorVendaTotal)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            Lucro potencial: {formatarMoeda(metricas.lucroProjetado)}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome do produto, código de barras ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Categoria filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full md:w-44 px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            >
              <option value="todas">Todas Categorias</option>
              {categoriasDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full md:w-36 px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            >
              <option value="todos">Todos Status</option>
              <option value="ok">Estoque Normal</option>
              <option value="baixo">Estoque Baixo</option>
              <option value="zerado">Esgotado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table or Empty State */}
      {produtos.length === 0 ? (
        /* Empty State when no products created yet */
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum produto cadastrado no estoque</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
            Todas as informações deste sistema são criadas por você. Comece cadastrando os produtos,
            preços de custo/venda e quantidades para iniciar o controle.
          </p>
          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Meu Primeiro Produto</span>
          </button>
        </div>
      ) : produtosFiltrados.length === 0 ? (
        /* Empty search results */
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <p className="text-sm text-gray-500">Nenhum produto encontrado com os filtros selecionados.</p>
          <button
            onClick={() => {
              setBusca('');
              setFiltroCategoria('todas');
              setFiltroStatus('todos');
            }}
            className="mt-3 text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        /* Products Table */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Produto / Código</th>
                  <th className="py-3 px-4">Categoria / Unidade</th>
                  <th className="py-3 px-4 text-right">Preço Custo</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {produtosFiltrados.map((prod) => {
                  const qtd = prod.estoque_atual;
                  const min = prod.estoque_minimo;
                  const isEsgotado = qtd <= 0;
                  const isBaixo = !isEsgotado && qtd <= min;
                  const lucroUnit = prod.preco_venda - prod.preco_custo;
                  const margem = prod.preco_custo > 0 ? (lucroUnit / prod.preco_custo) * 100 : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Nome e Código de Barras */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">{prod.nome}</div>
                        {prod.codigo_barras && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono mt-0.5">
                            <Barcode className="w-3 h-3 text-gray-400" />
                            <span>{prod.codigo_barras}</span>
                          </div>
                        )}
                      </td>

                      {/* Categoria e Unidade */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-gray-700">
                          {prod.categoria}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-1.5 font-semibold">
                          ({prod.unidade_medida})
                        </span>
                      </td>

                      {/* Preço Custo */}
                      <td className="py-3.5 px-4 text-right text-gray-600 font-mono">
                        {formatarMoeda(prod.preco_custo)}
                      </td>

                      {/* Preço Venda e Margem */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-semibold text-gray-900 font-mono">
                          {formatarMoeda(prod.preco_venda)}
                        </div>
                        <div className="text-[10px] text-emerald-600">
                          +{margem.toFixed(0)}% ({formatarMoeda(lucroUnit)})
                        </div>
                      </td>

                      {/* Estoque e Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              isEsgotado
                                ? 'bg-rose-100 text-rose-800'
                                : isBaixo
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isEsgotado && <XCircle className="w-3 h-3 text-rose-600" />}
                            {isBaixo && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            {!isEsgotado && !isBaixo && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                            <span>
                              {formatarNumero(qtd, prod.unidade_medida === 'KG' || prod.unidade_medida === 'L' ? 3 : 0)}{' '}
                              {prod.unidade_medida}
                            </span>
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Mín: {prod.estoque_minimo} {prod.unidade_medida}
                        </div>
                      </td>

                      {/* Valor Total em Estoque */}
                      <td className="py-3.5 px-4 text-right font-medium text-gray-800 font-mono">
                        {formatarMoeda(qtd * prod.preco_venda)}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setProdutoAjustando(prod)}
                            title="Ajustar Estoque (+ Entrada / - Saída)"
                            className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setProdutoEditando(prod)}
                            title="Editar Dados do Produto"
                            className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => confirmarExclusao(prod.id)}
                            title="Excluir Produto"
                            className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              Mostrando <strong>{produtosFiltrados.length}</strong> de <strong>{produtos.length}</strong> produtos
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Estoque Baixo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Esgotado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      {isModalNovoAberto && (
        <ProdutoFormModal
          isOpen={isModalNovoAberto}
          onClose={() => setIsModalNovoAberto(false)}
          onSave={onSalvarProduto}
          produtoEmEdicao={null}
        />
      )}

      {produtoEditando && (
        <ProdutoFormModal
          isOpen={true}
          onClose={() => setProdutoEditando(null)}
          onSave={onSalvarProduto}
          produtoEmEdicao={produtoEditando}
        />
      )}

      {produtoAjustando && (
        <AjusteEstoqueModal
          produto={produtoAjustando}
          isOpen={true}
          onClose={() => setProdutoAjustando(null)}
          onConfirmar={onAjustarEstoque}
        />
      )}
    </div>
  );
};
