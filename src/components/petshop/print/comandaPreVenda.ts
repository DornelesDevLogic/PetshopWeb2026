import { DadosEmpresa } from '@/types/petshop';

interface ComandaPreVendaData {
  id:            number;
  cliente_id?:   number;
  cliente:       string;
  telefone?:     string;
  celular?:      string;
  endereco?:     string;
  numero?:       string;
  bairro?:       string;
  cidade?:       string;
  data:          string;
  hora?:         string;
  data_entrega?: string;
  hora_entrega?: string;
  pz_entrega?:   string;
  animal?:       string;
  profissional?: string;
  formapgto?:    string;
  condpgto?:     string;
  dados?:        string;
  valor_frete?:  number;
  desconto?:     number;
  itens: Array<{ produto: string; qtd: number; valor: number }>;
  empresa?:      DadosEmpresa | null;
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtData(s?: string): string {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 16).replace('T', ' ');
  const [d, t = ''] = s.split(/[T ]/);
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}${t ? ' ' + t.slice(0, 5) : ''}`;
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
  font-size: 9.5pt;
  font-weight: 600;
  width: 72mm;
  color: #000;
  line-height: 1.3;
  -webkit-font-smoothing: none;
}
p { margin: 0.3mm 0; }
.center { text-align: center; }
.bold { font-weight: 700; }
/* Logo desativado por enquanto (a pedido) — CSS mantido para reativar no futuro.
.logo-area { width: 100%; max-height: 18mm; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5mm; }
.logo-area img { max-width: 100%; max-height: 18mm; object-fit: contain; }
*/
hr.solid { border: none; border-top: 2px solid #000; margin: 1.5mm 0; }
hr.dashed { border: none; border-top: 1.5px dashed #000; margin: 1.5mm 0; }
.section-title { font-weight: 700; font-size: 9pt; text-transform: uppercase; margin: 2mm 0 0.5mm 0; }
.item-row { margin-top: 1.8mm; }
.item-desc { font-size: 9pt; font-weight: 700; }
.item-vals { display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: 600; margin-top: 0.3mm; }
.row { display: flex; justify-content: space-between; }
.total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 11pt; margin-top: 1mm; }
.obs-box { white-space: pre-wrap; font-size: 9pt; font-weight: 600; }
.assinatura { border-top: 1.5px solid #000; margin-top: 8mm; padding-top: 1mm; text-align: center; font-size: 9pt; font-weight: 600; }
`;

export function gerarComandaPreVenda(d: ComandaPreVendaData): string {
  const emp = d.empresa;
  const enderecoCliente = [d.endereco, d.numero].filter(Boolean).join(', ');

  const subtotal  = d.itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  const frete     = d.valor_frete ?? 0;
  const desconto  = d.desconto ?? 0;
  const total     = subtotal + frete - desconto;

  const linhasItens = d.itens.map((it) => {
    const total = it.qtd * it.valor;
    return `
      <div class="item-row">
        <div class="item-desc">${esc(it.produto)}</div>
        <div class="item-vals">
          <span>Preço: R$ ${fmtMoeda(it.valor)}</span>
          <span>Qtd: ${it.qtd}</span>
          <span>Total: R$ ${fmtMoeda(total)}</span>
        </div>
      </div>`;
  }).join('');

  const freteRow    = frete    > 0 ? `<div class="row"><span>Frete</span><span>R$ ${fmtMoeda(frete)}</span></div>` : '';
  const descontoRow = desconto > 0 ? `<div class="row"><span>Desconto</span><span>-R$ ${fmtMoeda(desconto)}</span></div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pré-venda #${d.id}</title>
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
  <p class="center bold" style="font-size:11pt;">PRÉ-VENDA</p>
  <p>Data: ${fmtData(d.data)}${d.hora ? '  Hora: ' + d.hora.slice(0, 5) : ''}</p>
  <p>Pré-venda Nº: ${d.id}</p>
  <hr class="dashed">
  <p class="section-title">Dados do cliente</p>
  <p>Nome: ${d.cliente_id ? d.cliente_id + ' ' : ''}${esc(d.cliente)}</p>
  ${d.telefone ? `<p>Fone: ${esc(d.telefone)}${d.celular ? '  Celular: ' + esc(d.celular) : ''}</p>` : (d.celular ? `<p>Celular: ${esc(d.celular)}</p>` : '')}
  ${enderecoCliente ? `<p>Endereço: ${esc(enderecoCliente)}</p>` : ''}
  ${d.bairro || d.cidade ? `<p>Bairro: ${esc(d.bairro) || '-'}   Cidade: ${esc(d.cidade) || '-'}</p>` : ''}
  ${d.animal ? `<p>Pet: ${esc(d.animal)}</p>` : ''}
  ${d.profissional ? `<p>Vendedor: ${esc(d.profissional)}</p>` : ''}
  <hr class="dashed">
  <p class="section-title">Produtos</p>
  ${linhasItens}
  <hr class="solid">
  <div class="row"><span>Subtotal</span><span>R$ ${fmtMoeda(subtotal)}</span></div>
  ${freteRow}
  ${descontoRow}
  <div class="total-row"><span>TOTAL:</span><span>R$ ${fmtMoeda(total)}</span></div>
  <hr class="dashed">
  <p class="section-title">Dados da entrega</p>
  ${d.data_entrega ? `<p>Data entrega: ${fmtData(d.data_entrega)}</p>` : ''}
  ${d.hora_entrega ? `<p>Hora entrega: ${d.hora_entrega.slice(0, 5)}</p>` : ''}
  ${d.pz_entrega ? `<p>Prazo de entrega: ${esc(d.pz_entrega)}</p>` : ''}
  ${d.formapgto ? `<p>Forma pgto: ${esc(d.formapgto)}</p>` : ''}
  ${d.condpgto ? `<p>Cond. pgto: ${esc(d.condpgto)}</p>` : ''}
  ${d.dados ? `<p>Obs:</p><div class="obs-box">${esc(d.dados)}</div>` : ''}
  <div class="assinatura">Ass: _______________________________</div>
</body>
</html>`;
}
