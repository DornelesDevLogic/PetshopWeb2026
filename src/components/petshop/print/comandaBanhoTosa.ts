interface ComandaBanhoTosaData {
  id: number;
  cliente: string;
  telefone?: string;
  celular?: string;
  data: string;
  hora?: string;
  profissional?: string;
  servico?: string;
  animal?: string;
  raca?: string;
  obs?: string;
  banho_normal?: string;
  tosa_alta?: string;
  tosa_baixa?: string;
  antipulga?: string;
  hidra?: string;
  medic?: string;
  valor?: string | number;
  sub_total?: string | number;
}

function fmtData(s: string): string {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split('T')[0].split(' ')[0];
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
}

function fmtVal(v: string | undefined): string {
  if (!v || v === '0' || v.trim() === '') return '';
  const n = parseFloat(v.replace(',', '.'));
  if (isNaN(n)) return '';
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function checkItem(label: string, val?: string): string {
  const v = fmtVal(val);
  const checked = v ? '[X]' : '[ ]';
  return `<p>${checked} ${label}${v ? '   ' + v : ''}</p>`;
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
.section-title { font-weight: bold; font-size: 8pt; text-transform: uppercase; margin: 2mm 0 1mm 0; }
.blank-line { border-bottom: 1px solid #000; height: 5mm; margin: 2mm 0; }
`;

export function gerarComandaBanhoTosa(d: ComandaBanhoTosaData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Comanda Banho e Tosa #${d.id}</title>
<style>${CSS}</style>
</head>
<body>
  <div class="logo-area">Logotipo</div>
  <p class="center bold">NOME DA EMPRESA</p>
  <hr class="solid">
  <p class="center bold">COMANDA DE BANHO E TOSA</p>
  <p class="center">#${d.id}</p>
  <p>Data: ${fmtData(d.data)}${d.hora ? '  Hora: ' + d.hora.slice(0, 5) : ''}</p>
  <hr class="dashed">
  <p class="section-title">Cliente</p>
  <p>${d.cliente}</p>
  ${d.telefone ? `<p>Tel: ${d.telefone}</p>` : ''}
  ${d.celular ? `<p>Cel: ${d.celular}</p>` : ''}
  <hr class="dashed">
  <p class="section-title">Pet</p>
  ${d.animal ? `<p class="bold" style="font-size:11pt;">${d.animal}</p>` : ''}
  ${d.raca ? `<p>Raça: ${d.raca}</p>` : ''}
  <hr class="dashed">
  <p class="section-title">Serviços</p>
  ${checkItem('Banho Normal', d.banho_normal)}
  ${checkItem('Tosa Alta', d.tosa_alta)}
  ${checkItem('Tosa Baixa', d.tosa_baixa)}
  ${checkItem('Antipulga', d.antipulga)}
  ${checkItem('Hidratação', d.hidra)}
  ${checkItem('Medicação', d.medic)}
  <p>[ ] Outros: _______________________</p>
  <p>[ ] Corte de unhas</p>
  <p>[ ] Limpeza de ouvidos</p>
  <hr class="dashed">
  <p class="section-title">Observações / Instruções Especiais</p>
  ${d.obs ? `<p>${d.obs}</p>` : ''}
  <div class="blank-line"></div>
  <div class="blank-line"></div>
  <div class="blank-line"></div>
  <hr class="dashed">
  <p class="section-title">Controle Interno</p>
  <p>Profissional: ${d.profissional ?? '_________________________'}</p>
  <p>Entrada: ______  Saída: ______</p>
  <p>Assinatura: _______________________________</p>
  <hr class="solid">
  <p class="center">Obrigado pela preferência!</p>
</body>
</html>`;
}
