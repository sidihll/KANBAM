/**
 * Utilitários de formatação para moeda (BRL), números, datas e códigos
 */

export function formatarMoeda(valor: number): string {
  if (isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatarNumero(valor: number, decimais: number = 2): string {
  if (isNaN(valor)) return '0';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
}

export function formatarDataHora(dataIso: string): string {
  if (!dataIso) return '-';
  try {
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataIso;
  }
}

export function formatarDataSimples(dataIso: string): string {
  if (!dataIso) return '-';
  try {
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dataIso;
  }
}

export function gerarCodigoBarras(): string {
  // Gera um EAN-13 fictício válido com prefixo 789 (Brasil)
  let code = '789';
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  // Cálculo do dígito verificador
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(code[i], 10);
    soma += i % 2 === 0 ? digito : digito * 3;
  }
  const dv = (10 - (soma % 10)) % 10;
  return code + dv.toString();
}

export function gerarIdUnico(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function getFormaPagamentoLabel(forma: string): string {
  switch (forma) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'PIX';
    case 'cartao_credito':
      return 'Cartão de Crédito';
    case 'cartao_debito':
      return 'Cartão de Débito';
    case 'vale_alimentacao':
      return 'Vale Alimentação/Refeição';
    default:
      return 'Outro';
  }
}
