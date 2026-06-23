const MAX_DIM  = 1024;
const QUALITY  = 0.82;
const MAX_FILE = 20; // MB

export function validarArquivo(file: File): string | null {
  if (!file.type.startsWith('image/'))
    return 'Selecione um arquivo de imagem (JPG, PNG, WEBP…).';
  if (file.size > MAX_FILE * 1024 * 1024)
    return `Arquivo muito grande. Máximo aceito: ${MAX_FILE} MB.`;
  return null;
}

export function comprimirParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      if (w > MAX_DIM || h > MAX_DIM) {
        if (w >= h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        else        { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas não disponível neste browser.')); return; }

      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);

      const b64 = canvas.toDataURL('image/jpeg', QUALITY).split(',')[1];
      if (!b64) { reject(new Error('Falha ao gerar base64.')); return; }
      resolve(b64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível carregar a imagem.'));
    };

    img.src = objectUrl;
  });
}
