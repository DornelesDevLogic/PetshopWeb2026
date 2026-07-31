import { DadosEmpresa, AgendaItemServico } from '@/types/petshop';

interface CupomAgendaData {
  id:            number;
  cliente_id:    number;
  cliente:       string;
  telefone?:     string;
  celular?:      string;
  endereco?:     string;
  numero?:       string;
  bairro?:       string;
  cidade?:       string;
  data:          string;
  hora?:         string;
  data_previsao?:string;   // início previsto
  data_entrega?: string;   // término previsto
  profissional?: string;
  vendedor?:     string;
  servico?:      string;
  animal?:       string;
  raca?:         string;
  obs?:          string;
  valor?:        string | number;
  itens?:        AgendaItemServico[];
  empresa?:      DadosEmpresa | null;
}

function fmtData(s?: string): string {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 16).replace('T', ' ');
  const [d, t = ''] = s.split(/[T ]/);
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}${t ? ' ' + t.slice(0, 5) : ''}`;
  return s;
}

function fmtMoeda(v?: string | number): string {
  if (v === undefined || v === null || v === '') return '0,00';
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  if (isNaN(n)) return '0,00';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
.logo-area { width: 100%; max-height: 18mm; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5mm; }
.logo-area img { max-width: 100%; max-height: 18mm; object-fit: contain; }
hr.solid { border: none; border-top: 2px solid #000; margin: 1.5mm 0; }
hr.dashed { border: none; border-top: 1.5px dashed #000; margin: 1.5mm 0; }
.section-title { font-weight: 700; font-size: 9pt; text-transform: uppercase; margin: 2mm 0 0.5mm 0; }
.item-row { margin-top: 1.8mm; }
.item-desc { font-size: 9pt; font-weight: 700; }
.item-vals { display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: 600; margin-top: 0.3mm; }
.obs-box { white-space: pre-wrap; font-size: 9pt; font-weight: 600; }
.assinatura { border-top: 1.5px solid #000; margin-top: 8mm; padding-top: 1mm; text-align: center; font-size: 9pt; font-weight: 600; }
`;

export function gerarCupomAgenda(d: CupomAgendaData): string {
  const emp = d.empresa;

  const enderecoCliente = [d.endereco, d.numero].filter(Boolean).join(', ');

  const linhasItens = (d.itens ?? []).map((it) => {
    const precoStr = String(it.valor_liq ?? it.valor ?? '0');
    const qtd      = String(it.qtd ?? '1');
    const preco    = fmtMoeda(precoStr);
    const total    = fmtMoeda(parseFloat(precoStr.replace(',', '.')) * parseFloat(qtd.replace(',', '.')));
    return `
      <div class="item-row">
        <div class="item-desc">${esc(it.descricao || it.produto)}</div>
        <div class="item-vals">
          <span>Preço: R$ ${preco}</span>
          <span>Qtd: ${qtd}</span>
          <span>Total: R$ ${total}</span>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Agenda #${d.id}</title>
<style>${CSS}</style>
</head>
<body>
  ${emp?.logo_base64
    ? `<div class="logo-area"><img src="data:${emp.logo_mime ?? 'image/png'};base64,${emp.logo_base64}" alt="logo"></div>`
    : ''}
  <p class="center bold">${esc(emp?.fantasia || emp?.nome || 'PETSHOP')}</p>
  ${emp?.endereco ? `<p class="center">Endereço: ${esc([emp.endereco, emp.numero, emp.bairro].filter(Boolean).join(', '))}</p>` : ''}
  ${(emp?.cep || emp?.cidade) ? `<p class="center">CEP: ${esc(emp?.cep)}  Cidade: ${esc(emp?.cidade)}</p>` : ''}
  ${emp?.fone ? `<p class="center">Fone: ${esc(emp.fone)}</p>` : ''}
  <hr class="solid">
  <p>Data: ${fmtData(d.data)}</p>
  <p>Agenda Nº: ${d.id}</p>
  <hr class="dashed">
  <p class="section-title">Dados do animal</p>
  <p>Nome: ${esc(d.animal)}</p>
  ${d.raca ? `<p>Raça: ${esc(d.raca)}</p>` : ''}
  <p>Serviço: ${esc(d.servico)}</p>
  ${d.vendedor ? `<p>Vendedor: ${esc(d.vendedor)}</p>` : ''}
  ${d.profissional ? `<p>Profissional: ${esc(d.profissional)}</p>` : ''}
  <p>Obs:</p>
  <div class="obs-box">${esc(d.obs) || '-'}</div>
  ${d.itens && d.itens.length > 0 ? `
  <hr class="dashed">
  <p class="section-title">Itens</p>
  ${linhasItens}` : ''}
  <hr class="solid">
  <p class="bold">Valor Total: R$ ${fmtMoeda(d.valor)}</p>
  <hr class="dashed">
  <p class="section-title">Dados do cliente</p>
  <p>Nome: ${d.cliente_id} ${esc(d.cliente)}</p>
  ${d.telefone ? `<p>Fone: ${esc(d.telefone)}${d.celular ? '  Celular: ' + esc(d.celular) : ''}</p>` : (d.celular ? `<p>Celular: ${esc(d.celular)}</p>` : '')}
  <p>Endereço: ${esc(enderecoCliente) || '-'}</p>
  <p>Bairro: ${esc(d.bairro) || '-'}   Cidade: ${esc(d.cidade) || '-'}</p>
  <hr class="dashed">
  <p>Data e Hora da Agenda: ${fmtData(d.data_previsao) || fmtData(d.data) + (d.hora ? ' ' + d.hora.slice(0, 5) : '')}</p>
  ${d.data_entrega ? `<p>Previsão de Entrega: ${fmtData(d.data_entrega)}</p>` : ''}
  <div class="assinatura">Ass: _______________________________</div>
</body>
</html>`;
}
