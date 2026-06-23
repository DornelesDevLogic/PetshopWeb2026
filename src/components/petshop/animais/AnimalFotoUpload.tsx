'use client';

import { useState, useRef, useTransition, useCallback } from 'react';
import { Camera, ImageUp, Trash2, Loader2, AlertTriangle, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadFoto, deleteFoto } from '@/app/(petshop)/animais/[id]/actions';
import { comprimirParaBase64, validarArquivo } from '@/lib/foto';

interface Props {
  animalId:  number;
  clienteId: number;
}

/* ── Componente ─────────────────────────────────────────────────────────────── */
export default function AnimalFotoUpload({ animalId, clienteId }: Props) {
  const [isPending,  startTransition] = useTransition();
  const [hasFoto,    setHasFoto]      = useState(true);   // otimista; onError corrige
  const [cacheKey,   setCacheKey]     = useState(0);       // força nova URL após upload
  const [error,      setError]        = useState('');
  const [confirmDel, setConfirmDel]   = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);   // capture="environment"
  const fileRef   = useRef<HTMLInputElement>(null);   // galeria / explorador

  const src = `/api/petshop/animais/${animalId}/foto?v=${cacheKey}`;

  /* ── Processa qualquer File selecionado ───────────────────────────────────── */
  const processarArquivo = useCallback(async (file: File) => {
    const erroValidacao = validarArquivo(file);
    if (erroValidacao) { setError(erroValidacao); return; }

    setError('');

    let b64: string;
    try {
      b64 = await comprimirParaBase64(file);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao processar a imagem.');
      return;
    }

    startTransition(async () => {
      const r = await uploadFoto(animalId, clienteId, b64);
      if (r.error) { setError(r.error); return; }
      setHasFoto(true);
      setCacheKey((k) => k + 1);
    });
  }, [animalId, clienteId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';   // permite re-selecionar o mesmo arquivo
    if (file) processarArquivo(file);
  }

  function handleDelete() {
    setError('');
    setConfirmDel(false);
    startTransition(async () => {
      const r = await deleteFoto(animalId, clienteId);
      if (r.error) { setError(r.error); return; }
      setHasFoto(false);
      setCacheKey((k) => k + 1);
    });
  }

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border bg-card p-5">

      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-1.5">
        <Camera className="h-3.5 w-3.5" />
        Foto do Animal
      </h2>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

        {/* ── Área da foto ──────────────────────────────────────────────────── */}
        <div className="relative h-44 w-44 shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-muted bg-muted/30 flex items-center justify-center">
          {hasFoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={cacheKey}
              src={src}
              alt="Foto do animal"
              className="h-full w-full object-cover"
              onLoad={() => setHasFoto(true)}
              onError={() => setHasFoto(false)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40 select-none">
              <ImageOff className="h-12 w-12" />
              <span className="text-xs font-medium">Sem foto</span>
            </div>
          )}

          {/* Overlay de carregamento */}
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* ── Controles ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 w-full sm:w-auto">

          {/* Input câmera (abre câmera traseira direto no celular) */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleChange}
          />
          {/* Input galeria / explorador de arquivos */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />

          <Button
            size="sm"
            disabled={isPending}
            onClick={() => cameraRef.current?.click()}
            className="w-full sm:w-auto justify-start sm:justify-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Tirar Foto
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => fileRef.current?.click()}
            className="w-full sm:w-auto justify-start sm:justify-center"
          >
            <ImageUp className="h-4 w-4 mr-2" />
            {hasFoto ? 'Trocar Arquivo' : 'Enviar Arquivo'}
          </Button>

          {/* Remover foto */}
          {hasFoto && !confirmDel && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setConfirmDel(true)}
              className="w-full sm:w-auto justify-start sm:justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Foto
            </Button>
          )}

          {/* Confirmação inline de remoção */}
          {confirmDel && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 space-y-2">
              <p className="text-sm font-medium text-destructive">Remover a foto?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  {isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : 'Confirmar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setConfirmDel(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            A imagem é redimensionada automaticamente<br />
            para no máximo 1024px antes de salvar.
          </p>

          {error && (
            <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
