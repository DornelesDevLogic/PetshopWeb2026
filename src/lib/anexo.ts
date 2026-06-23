/**
 * Conversão de anexos de exame (PDF, imagens, documentos) para base64.
 * Imagens são comprimidas; PDF/DOC vão direto. Limite de 20 MB.
 */
import { comprimirParaBase64 } from './foto';

const MAX_FILE = 20; // MB

/** Extensões aceitas (anexo de exame) */
export const EXTENSOES_ACEITAS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
export const ACCEPT_ATTR = EXTENSOES_ACEITAS.join(',');

const MIMES_DOC = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function extensaoDe(file: File): string {
  const ponto = file.name.lastIndexOf('.');
  return ponto >= 0 ? file.name.slice(ponto).toLowerCase() : '';
}

export function validarAnexo(file: File): string | null {
  const ext = extensaoDe(file);
  const tipoOk =
    file.type.startsWith('image/') ||
    MIMES_DOC.includes(file.type) ||
    EXTENSOES_ACEITAS.includes(ext);
  if (!tipoOk)
    return 'Formato não aceito. Use PDF, imagem (JPG/PNG) ou documento (DOC/DOCX).';
  if (file.size > MAX_FILE * 1024 * 1024)
    return `Arquivo muito grande. Máximo aceito: ${MAX_FILE} MB.`;
  return null;
}

/** Lê um arquivo qualquer como base64 puro (sem o prefixo data:) */
function arquivoParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const b64 = r.includes(',') ? r.split(',')[1] : r;
      if (!b64) { reject(new Error('Falha ao ler o arquivo.')); return; }
      resolve(b64);
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte o anexo em base64 conforme o tipo:
 * - imagem → comprime (reaproveita a lógica de foto)
 * - PDF/DOC → lê o binário direto
 * Retorna o base64 e a extensão normalizada.
 */
export async function anexoParaBase64(
  file: File,
): Promise<{ base64: string; extensao: string }> {
  const ext = extensaoDe(file) || (file.type === 'application/pdf' ? '.pdf' : '');
  if (file.type.startsWith('image/')) {
    const base64 = await comprimirParaBase64(file);
    return { base64, extensao: ext || '.jpg' };
  }
  const base64 = await arquivoParaBase64(file);
  return { base64, extensao: ext };
}

/** Formata tamanho em bytes para exibição (KB/MB) */
export function fmtTamanho(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
