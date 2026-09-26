import { getSupabaseClient } from './supabase.ts';
import { Produto, Venda, ItemVenda } from '../types/index.ts';
import { gerarIdUnico } from '../utils/formatters.ts';

const LOCAL_STORAGE_PRODUTOS = 'supermarket_produtos_data';
const LOCAL_STORAGE_VENDAS = 'supermarket_vendas_data';

// Obter dados locais
function getProdutosLocal(): Produto[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRODUTOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setProdutosLocal(produtos: Produto[]): void {
  localStorage.setItem(LOCAL_STORAGE_PRODUTOS, JSON.stringify(produtos));
}

function getVendasLocal(): Venda[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VENDAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setVendasLocal(vendas: Venda[]): void {
  localStorage.setItem(LOCAL_STORAGE_VENDAS, JSON.stringify(vendas));
}

export function isConectadoSupabase(): boolean {
  return getSupabaseClient() !== null;
}

// ----------------------------------------------------------------------
// PRODUTOS
// ----------------------------------------------------------------------

export async function carregarProdutos(): Promise<Produto[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.warn('Erro ao carregar produtos do Supabase, recorrendo ao local:', error.message);
        return getProdutosLocal();
      }

      const produtosConvertidos: Produto[] = (data || []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        codigo_barras: p.codigo_barras || '',
        categoria: p.categoria || 'Geral',
        unidade_medida: p.unidade_medida || 'UN',
        preco_custo: Number(p.preco_custo) || 0,
        preco_venda: Number(p.preco_venda) || 0,
        estoque_atual: Number(p.estoque_atual) || 0,
        estoque_minimo: Number(p.estoque_minimo) || 0,
        created_at: p.created_at,
      }));

      // Mantém cópia local sincronizada para offline
      setProdutosLocal(produtosConvertidos);
      return produtosConvertidos;
    } catch (err) {
      console.error('Erro na requisição ao Supabase:', err);
      return getProdutosLocal();
    }
  }

  return getProdutosLocal();
}

export async function salvarProduto(dados: Omit<Produto, 'id' | 'created_at'> & { id?: string }): Promise<Produto> {
  const agora = new Date().toISOString();
  const id = dados.id || gerarIdUnico();

  const novoProduto: Produto = {
    id,
    nome: dados.nome.trim(),
    codigo_barras: dados.codigo_barras ? dados.codigo_barras.trim() : '',
    categoria: dados.categoria || 'Mercearia',
    unidade_medida: dados.unidade_medida || 'UN',
    preco_custo: Number(dados.preco_custo) || 0,
    preco_venda: Number(dados.preco_venda) || 0,
    estoque_atual: Number(dados.estoque_atual) || 0,
    estoque_minimo: Number(dados.estoque_minimo) || 0,
    created_at: agora,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('produtos').upsert({
        id: novoProduto.id,
        nome: novoProduto.nome,
        codigo_barras: novoProduto.codigo_barras,
        categoria: novoProduto.categoria,
        unidade_medida: novoProduto.unidade_medida,
        preco_custo: novoProduto.preco_custo,
        preco_venda: novoProduto.preco_venda,
        estoque_atual: novoProduto.estoque_atual,
        estoque_minimo: novoProduto.estoque_minimo,
        created_at: novoProduto.created_at,
      });

      if (error) {
        console.warn('Erro ao salvar no Supabase, salvando apenas localmente:', error.message);
      }
    } catch (err) {
      console.error('Erro ao conectar ao Supabase:', err);
    }
  }

  // Atualiza local
  const produtos = getProdutosLocal();
  const index = produtos.findIndex((p) => p.id === id);
  if (index >= 0) {
    produtos[index] = novoProduto;
  } else {
    produtos.push(novoProduto);
  }
  setProdutosLocal(produtos);

  return novoProduto;
}

export async function atualizarProduto(produto: Produto): Promise<Produto> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({
          nome: produto.nome,
          codigo_barras: produto.codigo_barras,
          categoria: produto.categoria,
          unidade_medida: produto.unidade_medida,
          preco_custo: produto.preco_custo,
          preco_venda: produto.preco_venda,
          estoque_atual: produto.estoque_atual,
          estoque_minimo: produto.estoque_minimo,
        })
        .eq('id', produto.id);

      if (error) {
        console.warn('Erro ao atualizar produto no Supabase:', error.message);
      }
    } catch (err) {
      console.error('Erro ao conectar ao Supabase:', err);
    }
  }

  const produtos = getProdutosLocal();
  const index = produtos.findIndex((p) => p.id === produto.id);
  if (index >= 0) {
    produtos[index] = produto;
    setProdutosLocal(produtos);
  }

  return produto;
}

export async function excluirProduto(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao excluir no Supabase:', error.message);
      }
    } catch (err) {
      console.error('Erro ao conectar ao Supabase:', err);
    }
  }

  const produtos = getProdutosLocal().filter((p) => p.id !== id);
  setProdutosLocal(produtos);
}

export async function ajustarEstoque(
  produtoId: string,
  novoEstoqueOuDelta: number,
  tipo: 'definir' | 'delta' = 'delta'
): Promise<Produto | null> {
  const produtos = getProdutosLocal();
  const index = produtos.findIndex((p) => p.id === produtoId);
  if (index === -1) return null;

  const prod = produtos[index];
  const novoValor = tipo === 'definir' ? novoEstoqueOuDelta : prod.estoque_atual + novoEstoqueOuDelta;
  prod.estoque_atual = Math.max(0, novoValor);

  return await atualizarProduto(prod);
}

// ----------------------------------------------------------------------
// VENDAS
// ----------------------------------------------------------------------

export async function carregarVendas(): Promise<Venda[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: vendasData, error: errVendas } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false });

      if (errVendas) {
        console.warn('Erro ao carregar vendas do Supabase:', errVendas.message);
        return getVendasLocal();
      }

      const { data: itensData, error: errItens } = await supabase
        .from('itens_venda')
        .select('*');

      if (errItens) {
        console.warn('Erro ao carregar itens de venda do Supabase:', errItens.message);
      }

      const itens = (itensData || []).map((it: any) => ({
        id: it.id,
        venda_id: it.venda_id,
        produto_id: it.produto_id,
        produto_nome: it.produto_nome,
        quantidade: Number(it.quantidade) || 0,
        preco_unitario: Number(it.preco_unitario) || 0,
        preco_custo_unitario: Number(it.preco_custo_unitario) || 0,
        subtotal: Number(it.subtotal) || 0,
      }));

      const vendasFormatadas: Venda[] = (vendasData || []).map((v: any) => ({
        id: v.id,
        numero_venda: v.numero_venda,
        cliente_nome: v.cliente_nome || '',
        forma_pagamento: v.forma_pagamento,
        subtotal: Number(v.subtotal) || 0,
        desconto: Number(v.desconto) || 0,
        total: Number(v.total) || 0,
        valor_pago: v.valor_pago != null ? Number(v.valor_pago) : undefined,
        troco: v.troco != null ? Number(v.troco) : undefined,
        observacoes: v.observacoes || '',
        status: v.status || 'concluida',
        created_at: v.created_at,
        itens: itens.filter((i) => i.venda_id === v.id),
      }));

      setVendasLocal(vendasFormatadas);
      return vendasFormatadas;
    } catch (err) {
      console.error('Erro ao conectar ao Supabase:', err);
      return getVendasLocal();
    }
  }

  return getVendasLocal();
}

export async function registrarVenda(dados: {
  cliente_nome?: string;
  forma_pagamento: Venda['forma_pagamento'];
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
}): Promise<Venda> {
  const agora = new Date().toISOString();
  const vendaId = gerarIdUnico();

  // Gerar número de venda sequencial com base no histórico
  const vendasExistentes = getVendasLocal();
  const proximoNumero = (vendasExistentes.length + 1).toString().padStart(5, '0');
  const numeroVenda = `#${proximoNumero}`;

  const itensFormatados: ItemVenda[] = dados.itens.map((it) => ({
    id: gerarIdUnico(),
    venda_id: vendaId,
    produto_id: it.produto_id,
    produto_nome: it.produto_nome,
    quantidade: it.quantidade,
    preco_unitario: it.preco_unitario,
    preco_custo_unitario: it.preco_custo_unitario,
    subtotal: it.subtotal,
  }));

  const novaVenda: Venda = {
    id: vendaId,
    numero_venda: numeroVenda,
    cliente_nome: dados.cliente_nome || undefined,
    forma_pagamento: dados.forma_pagamento,
    subtotal: dados.subtotal,
    desconto: dados.desconto,
    total: dados.total,
    valor_pago: dados.valor_pago,
    troco: dados.troco,
    observacoes: dados.observacoes,
    status: 'concluida',
    created_at: agora,
    itens: itensFormatados,
  };

  // Deduz estoque dos produtos
  const produtos = getProdutosLocal();
  for (const item of dados.itens) {
    const prod = produtos.find((p) => p.id === item.produto_id);
    if (prod) {
      prod.estoque_atual = Math.max(0, prod.estoque_atual - item.quantidade);
    }
  }
  setProdutosLocal(produtos);

  // Se conectado ao Supabase, grava venda, itens e atualiza produtos
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // 1. Grava venda
      await supabase.from('vendas').insert({
        id: novaVenda.id,
        numero_venda: novaVenda.numero_venda,
        cliente_nome: novaVenda.cliente_nome || null,
        forma_pagamento: novaVenda.forma_pagamento,
        subtotal: novaVenda.subtotal,
        desconto: novaVenda.desconto,
        total: novaVenda.total,
        valor_pago: novaVenda.valor_pago || null,
        troco: novaVenda.troco || null,
        observacoes: novaVenda.observacoes || null,
        status: novaVenda.status,
        created_at: novaVenda.created_at,
      });

      // 2. Grava itens
      const itensParaSupabase = itensFormatados.map((it) => ({
        id: it.id,
        venda_id: it.venda_id,
        produto_id: it.produto_id,
        produto_nome: it.produto_nome,
        quantidade: it.quantidade,
        preco_unitario: it.preco_unitario,
        preco_custo_unitario: it.preco_custo_unitario,
        subtotal: it.subtotal,
        created_at: agora,
      }));
      await supabase.from('itens_venda').insert(itensParaSupabase);

      // 3. Atualiza estoques no Supabase
      for (const item of dados.itens) {
        const prod = produtos.find((p) => p.id === item.produto_id);
        if (prod) {
          await supabase
            .from('produtos')
            .update({ estoque_atual: prod.estoque_atual })
            .eq('id', prod.id);
        }
      }
    } catch (err) {
      console.error('Erro ao registrar venda no Supabase:', err);
    }
  }

  // Atualiza local
  vendasExistentes.unshift(novaVenda);
  setVendasLocal(vendasExistentes);

  return novaVenda;
}

export async function cancelarVenda(vendaId: string): Promise<Venda | null> {
  const vendas = getVendasLocal();
  const index = vendas.findIndex((v) => v.id === vendaId);
  if (index === -1) return null;

  const venda = vendas[index];
  if (venda.status === 'cancelada') return venda;

  venda.status = 'cancelada';

  // Devolve itens ao estoque
  const produtos = getProdutosLocal();
  for (const item of venda.itens) {
    const prod = produtos.find((p) => p.id === item.produto_id);
    if (prod) {
      prod.estoque_atual += item.quantidade;
    }
  }
  setProdutosLocal(produtos);
  setVendasLocal(vendas);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', vendaId);

      // Atualiza estoques devolvidos no Supabase
      for (const item of venda.itens) {
        const prod = produtos.find((p) => p.id === item.produto_id);
        if (prod) {
          await supabase
            .from('produtos')
            .update({ estoque_atual: prod.estoque_atual })
            .eq('id', prod.id);
        }
      }
    } catch (err) {
      console.error('Erro ao cancelar venda no Supabase:', err);
    }
  }

  return venda;
}

// Sincronizar dados locais para o Supabase (quando o usuário acabou de configurar o Supabase)
export async function sincronizarLocalParaSupabase(): Promise<{
  success: boolean;
  produtosCount: number;
  vendasCount: number;
  message: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, produtosCount: 0, vendasCount: 0, message: 'Supabase não está conectado.' };
  }

  try {
    const produtos = getProdutosLocal();
    const vendas = getVendasLocal();

    // Sincronizar produtos
    if (produtos.length > 0) {
      const produtosPayload = produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        codigo_barras: p.codigo_barras,
        categoria: p.categoria,
        unidade_medida: p.unidade_medida,
        preco_custo: p.preco_custo,
        preco_venda: p.preco_venda,
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo,
        created_at: p.created_at,
      }));

      const { error: errP } = await supabase.from('produtos').upsert(produtosPayload);
      if (errP) throw errP;
    }

    // Sincronizar vendas
    if (vendas.length > 0) {
      const vendasPayload = vendas.map((v) => ({
        id: v.id,
        numero_venda: v.numero_venda,
        cliente_nome: v.cliente_nome || null,
        forma_pagamento: v.forma_pagamento,
        subtotal: v.subtotal,
        desconto: v.desconto,
        total: v.total,
        valor_pago: v.valor_pago || null,
        troco: v.troco || null,
        observacoes: v.observacoes || null,
        status: v.status,
        created_at: v.created_at,
      }));

      const { error: errV } = await supabase.from('vendas').upsert(vendasPayload);
      if (errV) throw errV;

      // Sincronizar itens
      const todosItens: any[] = [];
      for (const v of vendas) {
        for (const it of v.itens) {
          todosItens.push({
            id: it.id,
            venda_id: v.id,
            produto_id: it.produto_id,
            produto_nome: it.produto_nome,
            quantidade: it.quantidade,
            preco_unitario: it.preco_unitario,
            preco_custo_unitario: it.preco_custo_unitario,
            subtotal: it.subtotal,
            created_at: v.created_at,
          });
        }
      }

      if (todosItens.length > 0) {
        const { error: errI } = await supabase.from('itens_venda').upsert(todosItens);
        if (errI) throw errI;
      }
    }

    return {
      success: true,
      produtosCount: produtos.length,
      vendasCount: vendas.length,
      message: `Sincronização concluída com sucesso! ${produtos.length} produtos e ${vendas.length} vendas enviadas ao Supabase.`,
    };
  } catch (err: any) {
    return {
      success: false,
      produtosCount: 0,
      vendasCount: 0,
      message: `Erro na sincronização: ${err.message || 'Falha ao sincronizar'}`,
    };
  }
}
