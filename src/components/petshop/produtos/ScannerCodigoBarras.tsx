'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanBarcode, AlertTriangle } from 'lucide-react';

// A API BarcodeDetector é nativa do navegador (sem instalar libs) — suportada
// no Chrome/Edge (Android e desktop). No Safari/iOS ainda não existe suporte,
// então avisamos o usuário a digitar o código manualmente nesse caso.
interface BarcodeDetectorResult {
  rawValue: string;
}
interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<BarcodeDetectorResult[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
}

interface Props {
  onScan: (codigo: string) => void;
}

export default function ScannerCodigoBarras({ onScan }: Props) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState('');
  const [suportado, setSuportado] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setSuportado(false);
      return;
    }
    setSuportado(true);
    setErro('');

    let ativo = true;
    const detector = new BarcodeDetectorCtor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (!ativo) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const loop = async () => {
          if (!ativo || !videoRef.current) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            if (codigos.length > 0) {
              onScan(codigos[0].rawValue);
              setOpen(false);
              return;
            }
          } catch {
            // frame ainda não pronto — ignora e tenta no próximo
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => {
        setErro('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
      });

    return () => {
      ativo = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onScan]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        title="Ler código de barras (câmera)"
      >
        <ScanBarcode className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-primary" />
              Ler código de barras
            </DialogTitle>
          </DialogHeader>

          {!suportado ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Este navegador não suporta leitura de código de barras pela câmera.
              Digite o código manualmente no campo de busca.
            </div>
          ) : erro ? (
            <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {erro}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                <div className="absolute inset-6 border-2 border-primary/70 rounded-lg pointer-events-none" />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Aponte a câmera para o código de barras do produto.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
