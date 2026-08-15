'use client';

import { Button } from '@/components/ui/button';
import { Printer, FileSpreadsheet } from 'lucide-react';

/** Botões "Imprimir" (window.print(), respeitando o @page A4 global — ver
 * globals.css) e "Exportar Excel" (na verdade .csv, ver lib/exportarCsv —
 * abre no Excel normalmente, sem depender de biblioteca com vulnerabilidade
 * conhecida). Reutilizado pelos relatórios; cada um manda seu próprio
 * onExportar com as colunas/linhas certas pros dados que está mostrando. */
export default function AcoesRelatorio({ onExportar }: { onExportar: () => void }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={onExportar}>
        <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
        Exportar Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        Imprimir
      </Button>
    </div>
  );
}
