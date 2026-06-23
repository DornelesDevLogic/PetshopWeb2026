'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnexoExame } from '@/types/petshop';
import { uploadAnexo, deleteAnexo } from '@/app/(petshop)/consultas/[id]/actions';
import {
  validarAnexo, anexoParaBase64, fmtTamanho, ACCEPT_ATTR,
} from '@/lib/anexo';
import { Button } from '@/components/ui/button';
import {
  Paperclip, Loader2, Trash2, Upload, FileText, FileImage, File as FileIcon,
  ExternalLink, Download, AlertCircle,
} from 'lucide-react';

interface Props {
  consultaId: number;
  anexos:     AnexoExame[];
  podeEditar: boolean;
}

function fmtData(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function IconePorTipo({ tipo }: { tipo: string }) {
  const t = (tipo || '').toLowerCase();
  if (t === '.pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(t)) return <FileImage className="h-4 w-4 text-blue-500" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

export default function AnexosExame({ consultaId, anexos, podeEditar }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [isPending, startTransition] = useTransition();
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ''; // permite reenviar o mesmo arquivo
    if (!file) return;

    setErro('');
    const erroValidacao = validarAnexo(file);
    if (erroValidacao) { setErro(erroValidacao); return; }

    setEnviando(true);
    try {
      const { base64, extensao } = await anexoParaBase64(file);
      const res = await uploadAnexo(consultaId, file.name, extensao, base64);
      if (res.error) { setErro(res.error); return; }
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao enviar o arquivo.');
    } finally {
      setEnviando(false);
    }
  }

  function handleExcluir(anexo: AnexoExame) {
    setErro('');
    setExcluindoId(anexo.id);
    startTransition(async () => {
      const res = await deleteAnexo(consultaId, anexo.id);
      setExcluindoId(null);
      if (res.error) { setErro(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Anexos de Exames ({anexos.length})
        </h2>
        {podeEditar && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={handleArquivo}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              {enviando
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Enviando...</>
                : <><Upload className="h-3.5 w-3.5 mr-1.5" />Anexar arquivo</>}
            </Button>
          </>
        )}
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />{erro}
        </div>
      )}

      {anexos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum exame anexado. Aceita PDF, imagens (JPG/PNG) e documentos (DOC/DOCX), até 20 MB.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <IconePorTipo tipo={a.tipo} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{a.nome || `Anexo ${a.id}`}</p>
                <p className="text-xs text-muted-foreground">
                  {[fmtData(a.data), fmtTamanho(a.tamanho), a.tipo?.replace('.', '').toUpperCase()]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
              <a
                href={`/api/petshop/anexos/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir / visualizar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={`/api/petshop/anexos/${a.id}?download=1`}
                title="Baixar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </a>
              {podeEditar && (
                <button
                  type="button"
                  title="Remover"
                  disabled={isPending && excluindoId === a.id}
                  onClick={() => handleExcluir(a)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-destructive disabled:opacity-50"
                >
                  {isPending && excluindoId === a.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
