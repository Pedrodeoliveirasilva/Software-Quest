/* =================================================================
   CORE / IMAGEM — prepara fotos antes de enviar
   Recorta a imagem no centro (quadrado) e reduz para 160 x 160 pixels em JPEG.
   Assim uma foto de celular de vários MB vira cerca de 15 KB.
   ================================================================= */
window.SQ = window.SQ || {};

SQ.imagem = {
  TAMANHO: 160,

  /** Recebe um File (de um <input type="file">) e devolve uma data URL JPEG quadrada. */
  async reduzir(arquivo, tamanho = SQ.imagem.TAMANHO) {
    if (!arquivo || !/^image\//.test(arquivo.type)) throw new Error('Escolha um arquivo de imagem (JPG ou PNG).');
    if (arquivo.size > 15 * 1024 * 1024) throw new Error('Imagem muito grande. Escolha uma de até 15 MB.');
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await new Promise((ok, erro) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => erro(new Error('Não foi possível abrir esta imagem. Tente outra em JPG ou PNG.'));
        i.src = url;
      });
      const lado = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = tamanho;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tamanho, tamanho);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        (img.naturalWidth - lado) / 2,
        (img.naturalHeight - lado) / 2,
        lado,
        lado,
        0,
        0,
        tamanho,
        tamanho
      );
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
};
