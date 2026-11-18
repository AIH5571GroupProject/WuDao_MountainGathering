import { useEffect, useRef, useState } from 'react';
import { wingbroneUrl } from './transition';

export function WingbronePortal({ language, onClose }: { language: 'zh' | 'en'; onClose: () => void }) {
  const tx = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [attempt, setAttempt] = useState(0), [status, setStatus] = useState<'loading' | 'ready' | 'slow'>('loading');
  const frame = useRef<HTMLIFrameElement>(null), close = useRef<HTMLButtonElement>(null);
  const url = wingbroneUrl(import.meta.env.BASE_URL, location.protocol);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    setStatus('loading');
    const timer = window.setTimeout(() => setStatus(s => s === 'ready' ? s : 'slow'), 20000);
    const message = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== new URL(url, location.href).origin) return;
      if (event.data?.type === 'wingbrone:ready') { setStatus('ready'); window.clearTimeout(timer); }
      if (event.data?.type === 'wingbrone:error') { setStatus('slow'); window.clearTimeout(timer); }
    };
    window.addEventListener('message', message);
    return () => { window.clearTimeout(timer); window.removeEventListener('message', message); };
  }, [attempt, url]);
  return <section className="game-portal" role="dialog" aria-modal="true" aria-label={tx('剑道 · 御风', 'Kendo · Windborne')}>
    <div className="game-toolbar">
      <button ref={close} onClick={onClose}>← {tx('退出御风 · 返回剑道', 'Leave Windborne · Back to Kendo')}</button>
      <span>{tx('剑道 / 御风台', 'KENDO / WINDBORNE')} <i>WINGBRONE</i></span>
      <a href={url} target="_blank" rel="noopener noreferrer">{tx('独立窗口', 'Open separately')} ↗</a>
    </div>
    <iframe key={attempt} ref={frame} src={url} title="WingBrone · 御风" allow="camera; fullscreen" referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setStatus('slow')} onLoad={() => { if (location.protocol === 'file:') setStatus('ready'); }} />
    {status !== 'ready' && <div className="game-loading" role="status">
      <p>{status === 'loading' ? tx('竹影正在聚拢，御风即将开启…', 'The grove is gathering. Windborne is loading…') : tx('游戏仍未就绪，可重试或在独立窗口打开。', 'The game is not ready yet. Retry or open it separately.')}</p>
      {status === 'slow' && <button onClick={() => setAttempt(a => a + 1)}>{tx('重新载入', 'Try again')}</button>}
    </div>}
    <div className="game-footnote">{tx('游戏内 Esc 暂停 · 左上角退出并返回 · 离开时关闭游戏和摄像头', 'Esc pauses the game · Use the top-left button to return · Leaving closes the game and camera')}</div>
  </section>;
}
