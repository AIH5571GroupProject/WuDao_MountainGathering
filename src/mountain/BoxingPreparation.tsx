import { boxingShots } from './boxingShots';

type Props = {
  language: 'zh' | 'en';
  shot: number;
  paused: boolean;
  onShot: (index: number) => void;
  onPause: () => void;
  onPlay: () => void;
  onBack: () => void;
};

export function BoxingPreparation({ language, shot, paused, onShot, onPause, onPlay, onBack }: Props) {
  const tx = (zh: string, en: string) => language === 'zh' ? zh : en;
  const frame = boxingShots[shot];
  return <section className="sumo-preparation boxing-preparation" aria-labelledby="boxing-title" lang={language === 'zh' ? 'zh-CN' : 'en'} data-shot={shot}>
    <div className="sumo-film-frame" aria-hidden="true" />
    <div className="sumo-film-title">
      <p className="overline">04 / 06 · BOXING</p>
      <h1 id="boxing-title">{tx('拳击', 'Boxing')}</h1>
      <button className="journey-button" type="button" onClick={onBack}><span aria-hidden="true">←</span>{tx('返回山图', 'Back to mountain')}</button>
    </div>
    <div className="sumo-film-rail">
      <div className="sumo-film-copy" aria-live="polite">
        <h2>{tx(frame.title, frame.en)}</h2>
        <p>{tx(frame.caption, frame.captionEn)}</p>
      </div>
      <div className="sumo-film-actions">
        <div className="sumo-film-shots" role="group" aria-label={tx('选择镜头', 'Choose a shot')}>
          {boxingShots.map((item, index) => <button className="journey-button" key={item.title} type="button"
            onClick={() => onShot(index)} aria-pressed={shot === index}><small aria-hidden="true">0{index + 1}</small>{tx(item.title, item.en)}</button>)}
        </div>
        <button className="journey-button sumo-film-pause" type="button" onClick={onPause}>
          {paused ? tx('继续', 'Play') : tx('暂停', 'Pause')}
        </button>
        <button className="journey-button journey-primary" id="boxing-enter" type="button" onClick={onPlay}>{tx('进入拳击', 'Play Boxing')} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </section>;
}
