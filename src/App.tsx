import React, { useState, useEffect, useCallback } from 'react';
import { Produto, Venda, FormaPagamento } from './types/index.ts';
import {
  carregarProdutos,
  salvarProduto,
  excluirProduto,
  ajustarEstoque,
  carregarVendas,
  registrarVenda,
  cancelarVenda,
  isConectadoSupabase
} from './services/db.ts';
import { Header } from './components/Header.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { DashboardView } from './modules/Dashboard/DashboardView.tsx';
import { EstoqueView } from './modules/Estoque/EstoqueView.tsx';
import { VendasView } from './modules/Vendas/VendasView.tsx';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'estoque' | 'vendas'>('dashboard');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [isSupabaseOk, setIsSupabaseOk] = useState(false);

  // Modais globais
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [vendaParaRecibo, setVendaParaRecibo] = useState<Venda | null>(null);
  const [modalNovoProdutoAberto, setModalNovoProdutoAberto] = useState(false);

  // Notificações Toast
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    setToast({ tipo, texto });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Carregamento de dados
  const recarregarDados = useCallback(async () => {
    try {
      setIsSupabaseOk(isConectadoSupabase());
      const [listaProdutos, listaVendas] = await Promise.all([
        carregarProdutos(),
        carregarVendas(),
      ]);
      setProdutos(listaProdutos);
      setVendas(listaVendas);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      mostrarToast('Erro ao sincronizar informações.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarDados();
  }, [recarregarDados]);

  // Handlers de Produtos (Estoque)
  const handleSalvarProduto = async (
    dados: Omit<Produto, 'id' | 'created_at'> & { id?: string }
  ) => {
    try {
      const prod = await salvarProduto(dados);
      await recarregarDados();
      mostrarToast(`Produto "${prod.nome}" salvo com sucesso!`, 'sucesso');
    } catch (err: any) {
      mostrarToast(`Erro ao salvar produto: ${err.message}`, 'erro');
      throw err;
    }
  };

  const handleAjustarEstoque = async (
    produtoId: string,
    quantidade: number,
    tipo: 'definir' | 'delta'
  ) => {
    try {
      const prod = await ajustarEstoque(produtoId, quantidade, tipo);
      await recarregarDados();
      if (prod) {
        mostrarToast(`Estoque de "${prod.nome}" atualizado para ${prod.estoque_atual} ${prod.unidade_medida}!`, 'sucesso');
      }
    } catch (err: any) {
      mostrarToast(`Erro ao ajustar estoque: ${err.message}`, 'erro');
      throw err;
    }
  };

  const handleExcluirProduto = async (id: string) => {
    try {
      await excluirProduto(id);
      await recarregarDados();
      mostrarToast('Produto removido com sucesso.', 'info');
    } catch (err: any) {
      mostrarToast(`Erro ao excluir produto: ${err.message}`, 'erro');
      throw err;
    }
  };

  // Handlers de Vendas
  const handleRegistrarVenda = async (dados: {
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
  }): Promise<Venda> => {
    try {
      const novaVenda = await registrarVenda(dados);
      await recarregarDados();
      mostrarToast(`Venda ${novaVenda.numero_venda} concluída com sucesso!`, 'sucesso');
      return novaVenda;
    } catch (err: any) {
      mostrarToast(`Erro ao registrar venda: ${err.message}`, 'erro');
      throw err;
    }
  };

  const handleCancelarVenda = async (vendaId: string) => {
    try {
      const cancelada = await cancelarVenda(vendaId);
      await recarregarDados();
      if (cancelada) {
        mostrarToast(`Venda ${cancelada.numero_venda} cancelada e itens devolvidos ao estoque!`, 'info');
      }
    } catch (err: any) {
      mostrarToast(`Erro ao cancelar venda: ${err.message}`, 'erro');
      throw err;
    }
  };

  const handleVerRecibo = (venda: Venda) => {
    setVendaParaRecibo(venda);
    setReceiptModalOpen(true);
  };

  const handleNovaVendaRapida = () => {
    setCurrentTab('vendas');
  };

  const handleNovoProdutoRapido = () => {
    setCurrentTab('estoque');
    setModalNovoProdutoAberto(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 text-sm animate-bounce cursor-pointer ${
            toast.tipo === 'sucesso'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toast.tipo === 'erro'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-gray-900 text-white border-gray-700'
          }`}
          onClick={() => setToast(null)}
        >
          {toast.tipo === 'sucesso' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toast.tipo === 'erro' && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {toast.tipo === 'info' && <RefreshCw className="w-5 h-5 text-blue-400" />}
          <span className="font-medium">{toast.texto}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isSupabaseConnected={isSupabaseOk}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        onOpenNovoProduto={handleNovoProdutoRapido}
        onOpenNovaVenda={handleNovaVendaRapida}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-medium">Carregando sistema de supermercado...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                produtos={produtos}
                vendas={vendas}
                onIrParaEstoque={() => setCurrentTab('estoque')}
                onIrParaPdv={() => setCurrentTab('vendas')}
                onCadastrarProduto={handleNovoProdutoRapido}
              />
            )}

            {currentTab === 'estoque' && (
              <EstoqueView
                produtos={produtos}
                onSalvarProduto={handleSalvarProduto}
                onAjustarEstoque={handleAjustarEstoque}
                onExcluirProduto={handleExcluirProduto}
                isModalNovoAberto={modalNovoProdutoAberto}
                setIsModalNovoAberto={setModalNovoProdutoAberto}
              />
            )}

            {currentTab === 'vendas' && (
              <VendasView
                produtos={produtos}
                vendas={vendas}
                onRegistrarVenda={handleRegistrarVenda}
                onCancelarVenda={handleCancelarVenda}
                onVerRecibo={handleVerRecibo}
                onIrParaEstoque={() => setCurrentTab('estoque')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SuperMarket Gestão &bull; Sistema para Controle de Vendas e Estoque</span>
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className="text-emerald-600 hover:underline font-medium cursor-pointer"
          >
            {isSupabaseOk ? 'Conexão Supabase Ativa' : 'Configurar Conexão com Supabase'}
          </button>
        </div>
      </footer>

      {/* Modais Globais */}
      {supabaseModalOpen && (
        <SupabaseModal
          isOpen={supabaseModalOpen}
          onClose={() => setSupabaseModalOpen(false)}
          onConfigChanged={recarregarDados}
          produtosCount={produtos.length}
          vendasCount={vendas.length}
        />
      )}

      {receiptModalOpen && (
        <ReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          venda={vendaParaRecibo}
        />
      )}
    </div>
  );
}
