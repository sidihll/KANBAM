export type UnidadeMedida = 'UN' | 'KG' | 'L' | 'PCT' | 'CX' | 'G' | 'DZ';

export type CategoriaProduto =
  | 'Mercearia'
  | 'Hortifruti'
  | 'Açougue & Carnes'
  | 'Frios & Laticínios'
  | 'Padaria & Confeitaria'
  | 'Bebidas'
  | 'Limpeza'
  | 'Higiene Pessoal'
  | 'Congelados'
  | 'Pet Shop'
  | 'Outros';

export interface Produto {
  id: string;
  nome: string;
  codigo_barras: string;
  categoria: CategoriaProduto | string;
  unidade_medida: UnidadeMedida;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  created_at: string;
}

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'vale_alimentacao'
  | 'outro';

export interface ItemVenda {
  id: string;
  venda_id?: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo_unitario: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  numero_venda: string;
  cliente_nome?: string;
  forma_pagamento: FormaPagamento;
  subtotal: number;
  desconto: number;
  total: number;
  valor_pago?: number;
  troco?: number;
  observacoes?: string;
  status: 'concluida' | 'cancelada';
  created_at: string;
  itens: ItemVenda[];
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'estorno_venda';
  quantidade: number;
  saldo_anterior: number;
  saldo_novo: number;
  motivo?: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}
