import { DadosEmpresa } from '@/types/petshop';

interface ComandaTeleEntregaData {
  id: number;
  cliente: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  nro_endereco?: string;
  bairro?: string;
  cep?: string;
  data: string;
  hora?: string;
  data_entrega?: string;
  hora_entrega?: string;
  animal?: string;
  profissional?: string;
  formapgto?: string;
  condpgto?: string;
  dados?: string;
  valor_frete?: number;
  desconto?: number;
  itens: Array<{ produto: string; qtd: number; valor: number; cod_pro?: string; }>;
  empresa?: DadosEmpresa | null;
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtData(s: string): string {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split('T')[0].split(' ')[0];
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
}

function esc(s?: string): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CSS = `
@page { size: 80mm auto; margin: 2mm 3mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Arial', 'Segoe UI', sans-serif;
  font-size: 9pt;
  font-weight: 600;
  width: 72mm;
  color: #000;
  line-height: 1.3;
  -webkit-font-smoothing: none;
}
.center { text-align: center; }
.bold { font-weight: 700; }
/* Logo desativado por enquanto (a pedido) — CSS mantido para reativar no futuro.
.logo-area { width: 100%; max-height: 18mm; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5mm; }
.logo-area img { max-width: 100%; max-height: 18mm; object-fit: contain; }
*/
hr.solid { border: none; border-top: 2px solid #000; margin: 2mm 0; }
hr.dashed { border: none; border-top: 1.5px dashed #000; margin: 2mm 0; }
.row { display: flex; justify-content: space-between; }
.section-title { font-weight: 700; font-size: 8pt; text-transform: uppercase; margin: 2mm 0 1mm 0; }
.item-desc { font-size: 8.5pt; font-weight: 700; }
.item-detail { font-size: 8pt; font-weight: 600; color: #000; padding-left: 2mm; }
.total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 10pt; margin-top: 1mm; }
`;

export function gerarComandaTeleEntrega(d: ComandaTeleEntregaData): string {
  const emp = d.empresa;
  const subtotal = d.itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  const frete = d.valor_frete ?? 0;
  const desconto = d.desconto ?? 0;
  const total = subtotal + frete - desconto;

  const temEndereco = d.endereco || d.nro_endereco || d.bairro || d.cep;

  const endLine = [d.endereco, d.nro_endereco].filter(Boolean).join(', ');

  const itensHtml = d.itens.map(i => {
    const nome = i.produto.length > 28 ? i.produto.slice(0, 28) + '…' : i.produto;
    const itemTotal = i.qtd * i.valor;
    const codLine = i.cod_pro ? `<p class="item-detail">${i.cod_pro}</p>` : '';
    return `
      ${codLine}<p class="item-desc">${nome}</p>
      <p class="item-detail">${i.qtd} x R$ ${fmtMoeda(i.valor)} = R$ ${fmtMoeda(itemTotal)}</p>
    `;
  }).join('');

  const enderecoSection = temEndereco ? `
    <hr class="dashed">
    <p class="section-title">Endereço de Entrega</p>
    ${endLine ? `<p>${endLine}</p>` : ''}
    ${d.bairro ? `<p>${d.bairro}</p>` : ''}
    ${d.cep ? `<p>CEP: ${d.cep}</p>` : ''}
  ` : '<hr class="dashed">';

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
<title>Tele-Entrega #${d.id}</title>
<style>${CSS}</style>
</head>
<body>
  <!-- Logo desativado por enquanto (a pedido) — reativar trocando o comentário abaixo pelo bloco de img.
  ${emp?.logo_base64
    ? `<div class="logo-area"><img src="data:${emp.logo_mime ?? 'image/png'};base64,${emp.logo_base64}" alt="logo"></div>`
    : ''}
  -->
  <p class="center bold">${esc(emp?.fantasia || emp?.nome || 'PETSHOP')}</p>
  ${emp?.endereco ? `<p class="center">Endereço: ${esc([emp.endereco, emp.numero, emp.bairro].filter(Boolean).join(', '))}</p>` : ''}
  ${(emp?.cep || emp?.cidade) ? `<p class="center">CEP: ${esc(emp?.cep)}  Cidade: ${esc(emp?.cidade)}</p>` : ''}
  ${emp?.fone ? `<p class="center">Fone: ${esc(emp.fone)}</p>` : ''}
  <hr class="solid">
  <p class="center bold" style="font-size:11pt;">TELE-ENTREGA</p>
  <p class="center">#${d.id}</p>
  <p>Data pedido: ${fmtData(d.data)}${d.hora ? '  Hora: ' + d.hora.slice(0, 5) : ''}</p>
  <hr class="dashed">
  <p class="section-title">Cliente</p>
  <p>${d.cliente}</p>
  ${d.telefone ? `<p>Tel: ${d.telefone}</p>` : ''}
  ${d.celular ? `<p>Cel: ${d.celular}</p>` : ''}
  ${enderecoSection}
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
