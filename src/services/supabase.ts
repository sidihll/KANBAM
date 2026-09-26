import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'supermarket_supabase_url';
const STORAGE_KEY_KEY = 'supermarket_supabase_key';

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================
-- SCRIPT COMPLETO DE CRIAÇÃO DO BANCO E POLÍTICAS - SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================

-- 1. TABELA DE PRODUTOS (ESTOQUE)
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo_barras TEXT,
  categoria TEXT NOT NULL DEFAULT 'Mercearia',
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_atual NUMERIC(10,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos (codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos (categoria);

-- 2. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.vendas (
  id TEXT PRIMARY KEY,
  numero_venda TEXT NOT NULL,
  cliente_nome TEXT,
  forma_pagamento TEXT NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(10,2),
  troco NUMERIC(10,2),
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'concluida',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON public.vendas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON public.vendas (numero_venda);

-- 3. TABELA DE ITENS DA VENDA
CREATE TABLE IF NOT EXISTS public.itens_venda (
  id TEXT PRIMARY KEY,
  venda_id TEXT REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id TEXT,
  produto_nome TEXT NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  preco_custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON public.itens_venda (produto_id);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) NAS TABELAS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (RLS) PARA LEITURA E GRAVAÇÃO
DO $$ 
BEGIN
  -- Produtos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'Permitir acesso completo a produtos') THEN
    CREATE POLICY "Permitir acesso completo a produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Vendas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendas' AND policyname = 'Permitir acesso completo a vendas') THEN
    CREATE POLICY "Permitir acesso completo a vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Itens de Venda
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'itens_venda' AND policyname = 'Permitir acesso completo a itens_venda') THEN
    CREATE POLICY "Permitir acesso completo a itens_venda" ON public.itens_venda FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. CONFIGURAÇÃO DE BUCKET DE ARMAZENAMENTO (STORAGE) E POLÍTICAS
-- Criação do bucket 'supermercado' para fotos de produtos, comprovantes ou anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('supermercado', 'supermercado', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Armazenamento para o Supabase Storage (storage.objects)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir download publico de arquivos do supermercado') THEN
    CREATE POLICY "Permitir download publico de arquivos do supermercado"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'supermercado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir upload de arquivos do supermercado') THEN
    CREATE POLICY "Permitir upload de arquivos do supermercado"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'supermercado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir atualizacao de arquivos do supermercado') THEN
    CREATE POLICY "Permitir atualizacao de arquivos do supermercado"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'supermercado')
    WITH CHECK (bucket_id = 'supermercado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir exclusao de arquivos do supermercado') THEN
    CREATE POLICY "Permitir exclusao de arquivos do supermercado"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'supermercado');
  END IF;
END $$;
`;

let client: SupabaseClient | null = null;

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  client = null; // forçar reinicialização
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  client = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;

  const { url, anonKey } = getStoredSupabaseConfig();
  if (url && anonKey && !url.includes('your-project') && !anonKey.includes('your-anon-key')) {
    try {
      client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return client;
    } catch (err) {
      console.error('Falha ao inicializar cliente Supabase:', err);
      return null;
    }
  }

  return null;
}

export async function testarConexaoSupabase(url: string, anonKey: string): Promise<{ success: boolean; message: string; tablesFound?: boolean }> {
  try {
    if (!url || !anonKey) {
      return { success: false, message: 'URL e Anon Key são obrigatórios.' };
    }
    const testClient = createClient(url, anonKey);
    // Tenta consultar a tabela produtos
    const { data, error } = await testClient.from('produtos').select('id').limit(1);

    if (error) {
      // Se der erro de tabela não encontrada
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          tablesFound: false,
          message: 'Conectado ao Supabase com sucesso! Porém as tabelas ainda não foram criadas. Copie o script SQL e execute no Supabase SQL Editor.',
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Conexão estabelecida com sucesso! Tabelas prontas para armazenar seus dados.',
    };
  } catch (err: any) {
    return { success: false, message: `Falha de rede ou configuração inválida: ${err.message || 'Verifique a URL.'}` };
  }
}
