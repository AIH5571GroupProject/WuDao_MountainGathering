import { kendoShots } from './kendoShots';

type Props = {
  language: 'zh' | 'en'; shot: number; paused: boolean; fallback: boolean;
  onShot: (index: number) => void; onPause: () => void; onPlay: () => void; onBack: () => void;
};

export function KendoPreparation({ language, shot, paused, fallback, onShot, onPause, onPlay, onBack }: Props) {
  const tx = (zh: string, en: string) => language === 'zh' ? zh : en;
  const frame = kendoShots[shot];
  return <section className="kendo-preparation" aria-labelledby="kendo-title" data-shot={frame.id}>
    <div className="kendo-heading">
      <p className="overline">06 / 06 · KENDO</p>
      <h1 id="kendo-title">{tx('剑道', 'Kendo')}</h1>
      <p>{tx('参考《切腹》 · 1962', 'A scene study after Harakiri · 1962')}</p>
    </div>
    <div className="kendo-frame" aria-hidden="true"><span>{frame.number} / 03</span><span>MONITOR / KENDO</span></div>
    <div className="kendo-frame-title" key={frame.id} aria-live="polite">
      <span>{frame.number}</span><h2>{tx(frame.title, frame.en)}</h2>
    </div>
    {fallback && <p className="kendo-fallback">{tx('三维镜头暂时无法显示。仍可进入御风。', 'The 3D sequence is unavailable. You can still launch Windborne.')}</p>}
    <div className="kendo-rail">
      <div className="kendo-caption"><span>{frame.number} / 03</span><p>{tx(frame.line, frame.lineEn)}</p></div>
      <div className="kendo-controls">
        <button className="kendo-back" onClick={onBack}>← {tx('返回山图', 'Back to mountain')}</button>
        <div className="kendo-shots" role="group" aria-label={tx('选择分镜', 'Choose a shot')}>
          {kendoShots.map((item, index) => <button key={item.id} onClick={() => onShot(index)} aria-pressed={shot === index}>
            <span>{item.number}</span>{tx(item.title, item.en)}
          </button>)}
        </div>
        <button className="kendo-pause" onClick={onPause} aria-pressed={paused}>{paused ? tx('▶ 继续', '▶ Play') : tx('Ⅱ 暂停', 'Ⅱ Pause')}</button>
        <button className="kendo-game" onClick={onPlay}>{tx('进入御风', 'Play Windborne')} <span>↗</span></button>
      </div>
    </div>
  </section>;
}
