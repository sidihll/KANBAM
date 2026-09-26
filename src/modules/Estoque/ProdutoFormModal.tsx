import React, { useState, useEffect } from 'react';
import { X, Barcode, DollarSign, Package, Tag, Layers, Percent } from 'lucide-react';
import { Produto, CategoriaProduto, UnidadeMedida } from '../../types/index.ts';
import { gerarCodigoBarras, formatarMoeda } from '../../utils/formatters.ts';

interface ProdutoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (produto: Omit<Produto, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  produtoEmEdicao: Produto | null;
}

const CATEGORIAS_PADRAO: CategoriaProduto[] = [
  'Mercearia',
  'Hortifruti',
  'Açougue & Carnes',
  'Frios & Laticínios',
  'Padaria & Confeitaria',
  'Bebidas',
  'Limpeza',
  'Higiene Pessoal',
  'Congelados',
  'Pet Shop',
  'Outros',
];

const UNIDADES_MEDIDA: UnidadeMedida[] = ['UN', 'KG', 'L', 'PCT', 'CX', 'G', 'DZ'];

export const ProdutoFormModal: React.FC<ProdutoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  produtoEmEdicao,
}) => {
  const [nome, setNome] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoria, setCategoria] = useState<string>('Mercearia');
  const [unidadeMedida, setUnidadeMedida] = useState<UnidadeMedida>('UN');
  const [precoCusto, setPrecoCusto] = useState<string>('0.00');
  const [precoVenda, setPrecoVenda] = useState<string>('0.00');
  const [estoqueAtual, setEstoqueAtual] = useState<string>('0');
  const [estoqueMinimo, setEstoqueMinimo] = useState<string>('5');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (produtoEmEdicao) {
        setNome(produtoEmEdicao.nome);
        setCodigoBarras(produtoEmEdicao.codigo_barras || '');
        setCategoria(produtoEmEdicao.categoria);
        setUnidadeMedida(produtoEmEdicao.unidade_medida);
        setPrecoCusto(produtoEmEdicao.preco_custo.toString());
        setPrecoVenda(produtoEmEdicao.preco_venda.toString());
        setEstoqueAtual(produtoEmEdicao.estoque_atual.toString());
        setEstoqueMinimo(produtoEmEdicao.estoque_minimo.toString());
      } else {
        setNome('');
        setCodigoBarras(gerarCodigoBarras());
        setCategoria('Mercearia');
        setUnidadeMedida('UN');
        setPrecoCusto('');
        setPrecoVenda('');
        setEstoqueAtual('0');
        setEstoqueMinimo('5');
      }
      setErro(null);
    }
  }, [isOpen, produtoEmEdicao]);

  if (!isOpen) return null;

  const custoNum = parseFloat(precoCusto) || 0;
  const vendaNum = parseFloat(precoVenda) || 0;
  const lucroReal = vendaNum - custoNum;
  const margemLucro = custoNum > 0 ? ((lucroReal / custoNum) * 100).toFixed(1) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('O nome do produto é obrigatório.');
      return;
    }

    if (vendaNum < 0 || custoNum < 0) {
      setErro('Os valores de preço não podem ser negativos.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      await onSave({
        id: produtoEmEdicao?.id,
        nome: nome.trim(),
        codigo_barras: codigoBarras.trim(),
        categoria,
        unidade_medida: unidadeMedida,
        preco_custo: custoNum,
        preco_venda: vendaNum,
        estoque_atual: parseFloat(estoqueAtual) || 0,
        estoque_minimo: parseFloat(estoqueMinimo) || 0,
      });
      onClose();
    } catch (err: any) {
      setErro(`Erro ao salvar produto: ${err.message || 'Falha inesperada'}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarCodigo = () => {
    setCodigoBarras(gerarCodigoBarras());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-100 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-emerald-200" />
            <h3 className="font-semibold text-lg">
              {produtoEmEdicao ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
              {erro}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Nome do Produto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Arroz Branco Tipo 1 5kg, Leite Integral 1L, etc."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              autoFocus
            />
          </div>

          {/* Código de barras */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Código de Barras / EAN
              </label>
              <button
                type="button"
                onClick={handleGerarCodigo}
                className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <Barcode className="w-3.5 h-3.5" />
                Gerar Código Aleatório
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="7890000000000"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-mono"
              />
              <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Categoria e Unidade de Medida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              >
                {CATEGORIAS_PADRAO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Unidade de Medida
              </label>
              <select
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value as UnidadeMedida)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              >
                {UNIDADES_MEDIDA.map((un) => (
                  <option key={un} value={un}>
                    {un === 'UN'
                      ? 'UN (Unidade)'
                      : un === 'KG'
                      ? 'KG (Quilograma / Pesável)'
                      : un === 'L'
                      ? 'L (Litro)'
                      : un === 'PCT'
                      ? 'PCT (Pacote)'
                      : un === 'CX'
                      ? 'CX (Caixa)'
                      : un === 'G'
                      ? 'G (Grama)'
                      : 'DZ (Dúzia)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preços e Margem */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Preço de Custo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Preço de Venda (R$) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-semibold text-emerald-800"
                  />
                </div>
              </div>
            </div>

            {/* Margem calculada */}
            <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-white rounded-lg border border-gray-200 text-gray-600">
              <span className="flex items-center gap-1 font-medium">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                Margem Estimada:
              </span>
              <span className="font-semibold text-emerald-700">
                {margemLucro}% ({formatarMoeda(lucroReal)} por unidade)
              </span>
            </div>
          </div>

          {/* Estoques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Estoque Atual ({unidadeMedida})
              </label>
              <input
                type="number"
                step={unidadeMedida === 'KG' || unidadeMedida === 'L' ? '0.001' : '1'}
                min="0"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Estoque Mínimo (Alerta)
              </label>
              <input
                type="number"
                step={unidadeMedida === 'KG' || unidadeMedida === 'L' ? '0.001' : '1'}
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : produtoEmEdicao ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
