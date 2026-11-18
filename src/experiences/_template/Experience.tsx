import type { ExperienceProps } from '../types';

// Copy this file into one arena directory and enable its React entry in index.ts.
// For renderers/audio/cameras, create resources in useEffect and dispose them in its cleanup.
export default function Experience({ language, paused, onExit, onComplete }: ExperienceProps) {
  const zh = language === 'zh';
  return <section style={{ minHeight: '100%', display: 'grid', placeContent: 'center', textAlign: 'center', gap: 24, padding: 40 }}>
    <p>{zh ? '新的相逢，正在筹备中。' : 'A new encounter is taking shape.'}</p>
    <p role="status">{paused ? (zh ? '已暂停' : 'Paused') : (zh ? '准备就绪' : 'Ready')}</p>
    <button onClick={() => onComplete({ completed: true, summary: 'template' })}>{zh ? '完成体验' : 'Complete experience'}</button>
    <button onClick={onExit}>{zh ? '返回篇章' : 'Back to chapter'}</button>
  </section>;
}
