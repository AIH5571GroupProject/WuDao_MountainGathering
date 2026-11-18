import { drawCRTCard } from './crtCard';

export async function postcard(
  frame: HTMLCanvasElement | null,
  stats: { combo: number; hits: number; best: number },
) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  if (!context) throw Error('图片合成不可用');
  drawCRTCard(context, frame, stats);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG 导出失败')), 'image/png');
  });
}
