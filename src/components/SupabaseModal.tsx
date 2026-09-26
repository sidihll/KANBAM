import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testarConexaoSupabase,
  SUPABASE_SQL_SCHEMA
} from '../services/supabase.ts';
import { sincronizarLocalParaSupabase } from '../services/db.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
  produtosCount: number;
  vendasCount: number;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
  produtosCount,
  vendasCount,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testando, setTestando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincMsg, setSincMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setStatusMsg(null);
      setSincMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestarConexao = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setStatusMsg({
        tipo: 'erro',
        texto: 'Por favor preencha a URL do Projeto e a Chave Anon (Public Key).',
      });
      return;
    }

    setTestando(true);
    setStatusMsg(null);
    try {
      const resultado = await testarConexaoSupabase(url, anonKey);
      if (resultado.success) {
        if (resultado.tablesFound === false) {
          setStatusMsg({
            tipo: 'aviso',
            texto: resultado.message,
          });
        } else {
          setStatusMsg({
            tipo: 'sucesso',
            texto: resultado.message,
          });
        }
      } else {
        setStatusMsg({
          tipo: 'erro',
          texto: resultado.message,
        });
      }
    } catch (e: any) {
      setStatusMsg({
        tipo: 'erro',
        texto: `Erro: ${e.message || 'Falha de comunicação'}`,
      });
    } finally {
      setTestando(false);
    }
  };

  const handleSalvar = () => {
    if (!url.trim() || !anonKey.trim()) {
      setStatusMsg({
        tipo: 'erro',
        texto: 'Por favor informe a URL e a Chave Anon do seu projeto Supabase.',
      });
      return;
    }

    saveSupabaseConfig(url, anonKey);
    onConfigChanged();
    setStatusMsg({
      tipo: 'sucesso',
      texto: 'Configuração salva! O sistema agora enviará dados diretamente para o seu Supabase.',
    });
  };

  const handleDesconectar = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    onConfigChanged();
    setStatusMsg({
      tipo: 'aviso',
      texto: 'Supabase desconectado. O sistema continuará funcionando no modo local.',
    });
  };

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    setSincMsg(null);
    try {
      const res = await sincronizarLocalParaSupabase();
      setSincMsg(res.message);
      if (res.success) {
        onConfigChanged();
      }
    } catch (err: any) {
      setSincMsg(`Erro: ${err.message}`);
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Database className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Conexão com o Supabase</h2>
              <p className="text-xs text-emerald-100">
                Armazene produtos, vendas e relatórios na nuvem em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Alert */}
          {statusMsg && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                statusMsg.tipo === 'sucesso'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : statusMsg.tipo === 'aviso'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {statusMsg.tipo === 'sucesso' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMsg.tipo === 'aviso' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              {statusMsg.tipo === 'erro' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div>{statusMsg.texto}</div>
            </div>
          )}

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Project URL (Supabase)
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Encontrado em: <strong>Project Settings &gt; API &gt; Project URL</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Anon Public Key (Supabase)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-mono"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Encontrado em: <strong>Project Settings &gt; API &gt; Project API keys (anon public)</strong>
              </span>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestarConexao}
                disabled={testando}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                Testar Conexão
              </button>

              <button
                type="button"
                onClick={handleSalvar}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer ml-auto"
              >
                <ShieldCheck className="w-4 h-4" />
                Salvar & Conectar
              </button>

              {url && (
                <button
                  type="button"
                  onClick={handleDesconectar}
                  className="px-3.5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          {/* Sync local data banner if user has locally created data */}
          {(produtosCount > 0 || vendasCount > 0) && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-teal-900">Sincronizar Dados Locais</h4>
                  <p className="text-xs text-teal-700">
                    Você possui <strong>{produtosCount} produtos</strong> e <strong>{vendasCount} vendas</strong> cadastrados neste navegador.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSincronizar}
                  disabled={sincronizando}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sincronizando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Enviar para Supabase
                </button>
              </div>
              {sincMsg && <div className="mt-2 text-xs font-medium text-teal-900">{sincMsg}</div>}
            </div>
          )}

          {/* Instructions and SQL schema */}
          <div className="border-t border-gray-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  !
                </span>
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                  Script SQL para criar as tabelas no Supabase
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopiarSql}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md hover:bg-emerald-100 transition cursor-pointer"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado!' : 'Copiar Script SQL'}
              </button>
            </div>

            <p className="text-xs text-gray-600">
              No painel do Supabase, acesse <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, cole este script e clique em <strong>RUN</strong> para criar as tabelas <code className="bg-gray-100 px-1 py-0.5 rounded">produtos</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">vendas</code> e <code className="bg-gray-100 px-1 py-0.5 rounded">itens_venda</code>.
            </p>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-200 text-xs p-3.5 rounded-xl font-mono overflow-x-auto max-h-40 border border-gray-800 select-all leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
              <span>Precisa de uma conta?</span>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline flex items-center gap-1 font-medium"
              >
                Acessar Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>O sistema funciona de forma híbrida: dados ficam seguros no navegador e na nuvem.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
