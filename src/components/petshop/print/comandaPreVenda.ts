interface ComandaPreVendaData {
  id: number;
  cliente: string;
  telefone?: string;
  celular?: string;
  data: string;
  hora?: string;
  data_entrega?: string;
  hora_entrega?: string;
  pz_entrega?: string;
  animal?: string;
  profissional?: string;
  formapgto?: string;
  condpgto?: string;
  dados?: string;
  valor_frete?: number;
  desconto?: number;
  itens: Array<{ produto: string; qtd: number; valor: number; }>;
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtData(s: string): string {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split('T')[0].split(' ')[0];
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
}

const CSS = `
@page { size: 80mm auto; margin: 2mm 3mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', Courier, monospace; font-size: 9pt; width: 72mm; color: #000; }
.center { text-align: center; }
.bold { font-weight: bold; }
.logo-area { width: 100%; height: 20mm; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #999; margin-bottom: 4mm; }
hr.solid { border: none; border-top: 1px solid #000; margin: 2mm 0; }
hr.dashed { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
.row { display: flex; justify-content: space-between; }
.section-title { font-weight: bold; font-size: 8pt; text-transform: uppercase; margin: 2mm 0 1mm 0; }
.item-desc { font-size: 8.5pt; }
.item-detail { font-size: 8pt; color: #333; padding-left: 2mm; }
.total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; margin-top: 1mm; }
`;

export function gerarComandaPreVenda(d: ComandaPreVendaData): string {
  const subtotal = d.itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  const frete = d.valor_frete ?? 0;
  const desconto = d.desconto ?? 0;
  const total = subtotal + frete - desconto;

  const itensHtml = d.itens.map(i => {
    const nome = i.produto.length > 30 ? i.produto.slice(0, 30) + '…' : i.produto;
    const itemTotal = i.qtd * i.valor;
    return `
      <p class="item-desc">${nome}</p>
      <p class="item-detail">${i.qtd} x R$ ${fmtMoeda(i.valor)} = R$ ${fmtMoeda(itemTotal)}</p>
    `;
  }).join('');

  const freteRow = frete > 0
    ? `<div class="row"><span>Frete</span><span>R$ ${fmtMoeda(frete)}</span></div>`
    : '';

  const descontoRow = desconto > 0
    ? `<div class="row"><span>Desconto</span><span>-R$ ${fmtMoeda(desconto)}</span></div>`
    : '';

  const temProfOuDados = d.profissional || d.dados;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pré-Venda #${d.id}</title>
<style>${CSS}</style>
</head>
<body>
  <div class="logo-area">Logotipo</div>
  <p class="center bold">NOME DA EMPRESA</p>
  <hr class="solid">
  <p class="center bold" style="font-size:11pt;">PRÉ-VENDA</p>
  <p class="center">#${d.id}</p>
  <p>Data pedido: ${fmtData(d.data)}${d.hora ? '  Hora: ' + d.hora.slice(0, 5) : ''}</p>
  <hr class="dashed">
  <p class="section-title">Cliente</p>
  <p>${d.cliente}</p>
  ${d.telefone ? `<p>Tel: ${d.telefone}</p>` : ''}
  ${d.celular ? `<p>Cel: ${d.celular}</p>` : ''}
  <hr class="dashed">
  <p class="section-title">Produtos</p>
  ${itensHtml}
  <hr class="solid">
  <div class="row"><span>Subtotal</span><span>R$ ${fmtMoeda(subtotal)}</span></div>
  ${freteRow}
  ${descontoRow}
  <div class="total-row"><span>TOTAL:</span><span>R$ ${fmtMoeda(total)}</span></div>
  <hr class="solid">
  <p class="section-title">Dados da Entrega</p>
  ${d.data_entrega ? `<p>Data entrega: ${fmtData(d.data_entrega)}</p>` : ''}
  ${d.hora_entrega ? `<p>Hora entrega: ${d.hora_entrega.slice(0, 5)}</p>` : ''}
  ${d.pz_entrega ? `<p>Prazo de entrega: ${d.pz_entrega}</p>` : ''}
  ${d.formapgto ? `<p>Forma pgto: ${d.formapgto}</p>` : ''}
  ${d.condpgto ? `<p>Cond. pgto: ${d.condpgto}</p>` : ''}
  ${temProfOuDados ? '<hr class="dashed">' : ''}
  ${d.profissional ? `<p>Profissional/Vendedor: ${d.profissional}</p>` : ''}
  ${d.dados ? `<p>Obs: ${d.dados}</p>` : ''}
  <hr class="solid">
  <p class="center">Agradecemos a preferência!</p>
</body>
</html>`;
}
