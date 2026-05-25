'use client';

import { useState, useRef, useTransition } from 'react';
import { Camera, Upload, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadFoto, deleteFoto } from '@/app/(petshop)/animais/[id]/actions';

interface Props {
  animalId:  number;
  clienteId: number;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function AnimalFotoUpload({ animalId, clienteId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [hasFoto,  setHasFoto]      = useState(true);   // otimista; onError ajusta
  const [cacheKey, setCacheKey]     = useState(0);       // cache-buster na URL
  const [error,    setError]        = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const src = `/api/petshop/animais/${animalId}/foto?v=${cacheKey}`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';          // permite re-selecionar o mesmo arquivo
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError('Arquivo muito grande. Máximo permitido: 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // resultado: "data:image/jpeg;base64,XXXX..." — pegar só após a vírgula
      const b64 = (reader.result as string).split(',')[1];
      if (!b64) { setError('Não foi possível ler o arquivo.'); return; }

      setError('');
      startTransition(async () => {
        const r = await uploadFoto(animalId, clienteId, b64);
        if (r.error) { setError(r.error); return; }
        setHasFoto(true);
        setCacheKey((k) => k + 1);
      });
    };
    reader.onerror = () => setError('Erro ao ler o arquivo.');
    reader.readAsDataURL(file);
  }

  function handleDelete() {
    setError('');
    startTransition(async () => {
      const r = await deleteFoto(animalId, clienteId);
      if (r.error) { setError(r.error); return; }
      setHasFoto(false);
      setCacheKey((k) => k + 1);
    });
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-1.5">
        <Camera className="h-3.5 w-3.5" />
        Foto do Animal
      </h2>

      <div className="flex items-start gap-5">

        {/* ── Área da imagem ── */}
        <div className="relative h-36 w-36 shrink-0 rounded-xl overflow-hidden border bg-muted flex items-center justify-center">
          {hasFoto && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={cacheKey}
              src={src}
              alt="Foto do animal"
              className="h-full w-full object-cover"
              onLoad={() => setHasFoto(true)}
              onError={() => setHasFoto(false)}
            />
          )}
          {!hasFoto && (
            <Camera className="h-12 w-12 text-muted-foreground/30" />
          )}
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* ── Botões / mensagens ── */}
        <div className="flex flex-col gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {hasFoto ? 'Trocar Foto' : 'Enviar Foto'}
          </Button>

          {hasFoto && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remover Foto
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG ou GIF · máx. 5 MB
          </p>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
