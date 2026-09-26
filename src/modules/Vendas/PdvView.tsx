import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  Receipt,
  DollarSign,
  Tag,
  ArrowRight,
  PackageCheck,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Produto, Venda, FormaPagamento } from '../../types/index.ts';
import { formatarMoeda, formatarNumero } from '../../utils/formatters.ts';
import { FinalizarVendaModal } from './FinalizarVendaModal.tsx';

interface PdvItem {
  produto: Produto;
  quantidade: number;
}

interface PdvViewProps {
  produtos: Produto[];
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
  onVendaConcluida: (venda: Venda) => void;
  onIrParaEstoque: () => void;
}

export const PdvView: React.FC<PdvViewProps> = ({
  produtos,
  onRegistrarVenda,
  onVendaConcluida,
  onIrParaEstoque,
}) => {
  const [carrinho, setCarrinho] = useState<PdvItem[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const [tipoDesconto, setTipoDesconto] = useState<'reais' | 'porcentagem'>('reais');
  const [valorDesconto, setValorDesconto] = useState<string>('0');
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [mensagemAlerta, setMensagemAlerta] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Categorias disponíveis a partir dos produtos cadastrados
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    produtos.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats);
  }, [produtos]);

  // Produtos para o catálogo rápido
  const produtosExibidos = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termo));
      return matchCat && matchBusca;
    });
  }, [produtos, categoriaAtiva, busca]);

  // Totais do carrinho
  const subtotal = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.produto.preco_venda * item.quantidade, 0);
  }, [carrinho]);

  const descontoCalculado = useMemo(() => {
    const val = parseFloat(valorDesconto) || 0;
    if (val <= 0) return 0;
    if (tipoDesconto === 'porcentagem') {
      return (subtotal * Math.min(100, val)) / 100;
    }
    return Math.min(subtotal, val);
  }, [subtotal, valorDesconto, tipoDesconto]);

  const totalGeral = Math.max(0, subtotal - descontoCalculado);

  const totalItensCarrinho = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  }, [carrinho]);

  // Adicionar produto ao carrinho
  const handleAdicionarProduto = (produto: Produto, qtd: number = 1) => {
    setMensagemAlerta(null);

    // Valida estoque
    const itemExistente = carrinho.find((it) => it.produto.id === produto.id);
    const qtdAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
    const qtdTotalDesejada = qtdAtualNoCarrinho + qtd;

    if (produto.estoque_atual <= 0) {
      setMensagemAlerta(`Atenção: Produto "${produto.nome}" está esgotado no estoque!`);
    } else if (qtdTotalDesejada > produto.estoque_atual) {
      setMensagemAlerta(
        `Atenção: Estoque insuficiente! Disponível: ${produto.estoque_atual} ${produto.unidade_medida}.`
      );
      // Permite adicionar até o limite disponível se ainda puder
      if (qtdAtualNoCarrinho >= produto.estoque_atual) {
        return;
      }
    }

    setCarrinho((prev) => {
      const idx = prev.findIndex((it) => it.produto.id === produto.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx] = {
          ...novo[idx],
          quantidade: Number((novo[idx].quantidade + qtd).toFixed(3)),
        };
        return novo;
      } else {
        return [...prev, { produto, quantidade: qtd }];
      }
    });

    setBusca('');
    searchInputRef.current?.focus();
  };

  // Tratar leitura de código de barras ou busca ao pressionar Enter
  const handleKeyDownBusca = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const termo = busca.trim().toLowerCase();
      if (!termo) return;

      // 1. Tenta achar por código de barras exato
      let encontrado = produtos.find((p) => p.codigo_barras && p.codigo_barras.toLowerCase() === termo);

      // 2. Se não encontrou, tenta nome exato ou primeiro da busca
      if (!encontrado) {
        encontrado = produtos.find((p) => p.nome.toLowerCase() === termo);
      }
      if (!encontrado && produtosExibidos.length === 1) {
        encontrado = produtosExibidos[0];
      }

      if (encontrado) {
        handleAdicionarProduto(encontrado, 1);
      } else {
        setMensagemAlerta(`Nenhum produto cadastrado com código ou nome "${busca}".`);
      }
    }
  };

  // Alterar quantidade de item no carrinho
  const handleAlterarQuantidade = (produtoId: string, novaQtd: number) => {
    if (novaQtd <= 0) {
      handleRemoverItem(produtoId);
      return;
    }

    const prod = produtos.find((p) => p.id === produtoId);
    if (prod && novaQtd > prod.estoque_atual) {
      setMensagemAlerta(
        `Atenção: Quantidade informada (${novaQtd}) é superior ao estoque disponível (${prod.estoque_atual} ${prod.unidade_medida}).`
      );
    } else {
      setMensagemAlerta(null);
    }

    setCarrinho((prev) =>
      prev.map((it) => (it.produto.id === produtoId ? { ...it, quantidade: Number(novaQtd.toFixed(3)) } : it))
    );
  };

  // Remover item do carrinho
  const handleRemoverItem = (produtoId: string) => {
    setCarrinho((prev) => prev.filter((it) => it.produto.id !== produtoId));
  };

  // Limpar carrinho
  const handleLimparCarrinho = () => {
    if (carrinho.length === 0) return;
    if (confirm('Deseja limpar todos os itens do caixa?')) {
      setCarrinho([]);
      setValorDesconto('0');
      setMensagemAlerta(null);
    }
  };

  // Concluir venda
  const handleConfirmarVenda = async (dados: {
    forma_pagamento: FormaPagamento;
    cliente_nome?: string;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }) => {
    const itensFormatados = carrinho.map((it) => ({
      produto_id: it.produto.id,
      produto_nome: it.produto.nome,
      quantidade: it.quantidade,
      preco_unitario: it.produto.preco_venda,
      preco_custo_unitario: it.produto.preco_custo,
      subtotal: it.produto.preco_venda * it.quantidade,
    }));

    const novaVenda = await onRegistrarVenda({
      cliente_nome: dados.cliente_nome,
      forma_pagamento: dados.forma_pagamento,
      subtotal,
      desconto: descontoCalculado,
      total: totalGeral,
      valor_pago: dados.valor_pago,
      troco: dados.troco,
      observacoes: dados.observacoes,
      itens: itensFormatados,
    });

    // Limpa carrinho e avisa para abrir recibo
    setCarrinho([]);
    setValorDesconto('0');
    setMensagemAlerta(null);
    onVendaConcluida(novaVenda);
  };

  return (
    <div className="space-y-4">
      {/* Alerta / Notificação */}
      {mensagemAlerta && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{mensagemAlerta}</span>
          </div>
          <button
            onClick={() => setMensagemAlerta(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid Principal do PDV: Catálogo/Busca à Esquerda e Carrinho/Cupom à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo (Catálogo & Busca de Produtos) - 7 colunas */}
        <div className="lg:col-span-7 space-y-4">
          {/* Caixa de Entrada Rápida de Código / Nome */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-emerald-600" />
                Leitor de Código de Barras / Busca de Produto
              </label>
              <span className="text-[11px] text-gray-500">Pressione [ENTER] para adicionar</span>
            </div>

            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Escaneie o código de barras ou digite o nome do produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={handleKeyDownBusca}
                className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-medium"
                autoFocus
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
            </div>

            {/* Categorias Tabs para Toque Rápido */}
            {categorias.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCategoriaAtiva('todas')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    categoriaAtiva === 'todas'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas ({produtos.length})
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                      categoriaAtiva === cat
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid de Produtos Cadastrados */}
          {produtos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="font-bold text-gray-800 text-sm mb-1">Nenhum produto cadastrado</h4>
              <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                Para registrar vendas no caixa, você precisa primeiro cadastrar os produtos no estoque.
              </p>
              <button
                type="button"
                onClick={onIrParaEstoque}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition cursor-pointer"
              >
                Cadastrar Produtos no Estoque
              </button>
            </div>
          ) : produtosExibidos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
              <p className="text-xs text-gray-500">Nenhum produto encontrado com o termo digitado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
              {produtosExibidos.map((prod) => {
                const isEsgotado = prod.estoque_atual <= 0;
                const isBaixo = !isEsgotado && prod.estoque_atual <= prod.estoque_minimo;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAdicionarProduto(prod, 1)}
                    className="bg-white p-3 rounded-xl border border-gray-200/80 hover:border-emerald-500 hover:shadow-md transition text-left flex flex-col justify-between group cursor-pointer relative"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span className="truncate">{prod.categoria}</span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded ${
                            isEsgotado
                              ? 'bg-rose-100 text-rose-700'
                              : isBaixo
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {prod.estoque_atual} {prod.unidade_medida}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-gray-900 group-hover:text-emerald-700 transition line-clamp-2">
                        {prod.nome}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="font-bold text-sm text-emerald-800 font-mono">
                        {formatarMoeda(prod.preco_venda)}
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lado Direito (Carrinho do Caixa / Cupom da Venda) - 5 colunas */}
        <div className="lg:col-span-5 flex flex-col h-full space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col flex-1">
            {/* Header do Caixa */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Carrinho do Caixa</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                </span>
                {carrinho.length > 0 && (
                  <button
                    onClick={handleLimparCarrinho}
                    title="Limpar todos os itens"
                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Itens do Carrinho */}
            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-gray-100 my-2 pr-1">
              {carrinho.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhum item adicionado no caixa.</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Passe o código de barras ou clique nos produtos ao lado.
                  </p>
                </div>
              ) : (
                carrinho.map((item) => {
                  const subtotalItem = item.produto.preco_venda * item.quantidade;
                  const isKg = item.produto.unidade_medida === 'KG' || item.produto.unidade_medida === 'L';

                  return (
                    <div key={item.produto.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      {/* Descrição e Preço Unitário */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{item.produto.nome}</div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {formatarMoeda(item.produto.preco_venda)} / {item.produto.unidade_medida}
                        </div>
                      </div>

                      {/* Controle de Quantidade */}
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleAlterarQuantidade(item.produto.id, item.quantidade - (isKg ? 0.1 : 1))}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input
                          type="number"
                          step={isKg ? '0.001' : '1'}
                          min="0.001"
                          value={item.quantidade}
                          onChange={(e) =>
                            handleAlterarQuantidade(item.produto.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-center text-xs font-bold bg-transparent outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleAlterarQuantidade(item.produto.id, item.quantidade + (isKg ? 0.1 : 1))}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal e Remover */}
                      <div className="text-right min-w-[70px]">
                        <div className="font-bold text-gray-900 font-mono">
                          {formatarMoeda(subtotalItem)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverItem(item.produto.id)}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totais & Desconto */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal dos itens:</span>
                <span className="font-semibold text-gray-900 font-mono">{formatarMoeda(subtotal)}</span>
              </div>

              {/* Linha de Desconto */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Desconto:</span>
                  <button
                    type="button"
                    onClick={() => setTipoDesconto((t) => (t === 'reais' ? 'porcentagem' : 'reais'))}
                    className="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                  >
                    {tipoDesconto === 'reais' ? 'R$' : '%'}
                  </button>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={valorDesconto}
                    onChange={(e) => setValorDesconto(e.target.value)}
                    className="w-full px-2 py-1 text-right text-xs bg-gray-50 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {descontoCalculado > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Valor abatido:</span>
                  <span className="font-semibold font-mono">- {formatarMoeda(descontoCalculado)}</span>
                </div>
              )}

              {/* Total Geral Destacado */}
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-950 tracking-wider">
                    Total a Pagar
                  </span>
                  <div className="text-[11px] text-emerald-700">À vista ou cartão</div>
                </div>
                <div className="text-2xl font-black text-emerald-800 font-mono">
                  {formatarMoeda(totalGeral)}
                </div>
              </div>

              {/* Botão Finalizar */}
              <button
                type="button"
                onClick={() => setModalFinalizarAberto(true)}
                disabled={carrinho.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Cobrar e Finalizar Venda</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Finalização / Pagamento */}
      {modalFinalizarAberto && (
        <FinalizarVendaModal
          isOpen={modalFinalizarAberto}
          onClose={() => setModalFinalizarAberto(false)}
          subtotal={subtotal}
          desconto={descontoCalculado}
          total={totalGeral}
          itensCount={totalItensCarrinho}
          onConfirmarVenda={handleConfirmarVenda}
        />
      )}
    </div>
  );
};
