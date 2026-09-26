import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Database,
  Plus,
  ShoppingBag,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'dashboard' | 'estoque' | 'vendas';
  setCurrentTab: (tab: 'dashboard' | 'estoque' | 'vendas') => void;
  isSupabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
  onOpenNovoProduto: () => void;
  onOpenNovaVenda: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  isSupabaseConnected,
  onOpenSupabaseModal,
  onOpenNovoProduto,
  onOpenNovaVenda,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Supermarket Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-gray-900 tracking-tight">SuperMarket</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Gestão
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">Controle de Estoque, Vendas e Relatórios</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/60">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('estoque')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'estoque'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Estoque</span>
            </button>

            <button
              onClick={() => setCurrentTab('vendas')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'vendas'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Vendas</span>
            </button>
          </nav>

          {/* Right Area: Supabase Status & Quick Actions */}
          <div className="flex items-center gap-2.5">
            {/* Supabase status indicator button */}
            <button
              onClick={onOpenSupabaseModal}
              title="Configurar Conexão com Supabase"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isSupabaseConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <Database className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden md:inline">
                {isSupabaseConnected ? 'Supabase Conectado' : 'Supabase (Configurar)'}
              </span>
            </button>

            {/* Quick Action buttons */}
            <button
              onClick={onOpenNovaVenda}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Venda (PDV)</span>
              <span className="sm:hidden">PDV</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
