import { sumoShots } from './sumoShots';

type Props = {
  language: 'zh' | 'en';
  shot: number;
  settled: boolean;
  paused: boolean;
  fallback: boolean;
  onShot: (index: number) => void;
  onPause: () => void;
  onPlay: () => void;
  onBack: () => void;
};

export function SumoPreparation({ language, shot, settled, paused, fallback, onShot, onPause, onPlay, onBack }: Props) {
  const tx = (zh: string, en: string) => language === 'zh' ? zh : en;
  const frame = sumoShots[shot];
  const canPlay = shot === sumoShots.length - 1 && settled;
  return <section className="sumo-preparation" aria-labelledby="sumo-title" lang={language === 'zh' ? 'zh-CN' : 'en'} data-shot={shot}>
    <div className="sumo-film-frame" aria-hidden="true" />
    <div className="sumo-film-title">
      <p className="overline">05 / 06 · SUMO</p>
      <h1 id="sumo-title">{tx('相扑', 'Sumo')}</h1>
      <button className="journey-button" type="button" onClick={onBack}><span aria-hidden="true">←</span>{tx('返回山图', 'Back to mountain')}</button>
    </div>
    <div className="sumo-film-rail">
      <div className="sumo-film-copy" aria-live="polite">
        <h2>{tx(frame.title, frame.en)}</h2>
        <p>{tx(frame.caption, frame.captionEn)}</p>
        {fallback && <p>{tx('三维画面暂不可用，仍可进入游戏。', 'The 3D sequence is unavailable. The game can still be opened.')}</p>}
      </div>
      <div className="sumo-film-actions">
        <div className="sumo-film-shots" role="group" aria-label={tx('选择镜头', 'Choose a shot')}>
          {sumoShots.map((item, index) => <button className="journey-button" key={item.title} type="button"
            onClick={() => onShot(index)} aria-pressed={shot === index} disabled={!settled}><small aria-hidden="true">0{index + 1}</small>{tx(item.title, item.en)}</button>)}
        </div>
        {!fallback && <button className="journey-button sumo-film-pause" type="button" onClick={onPause} disabled={!settled}>
          {shot === 2 ? (paused ? tx('恢复动效', 'Resume motion') : tx('暂停动效', 'Pause motion')) : (paused ? tx('继续', 'Play') : tx('暂停', 'Pause'))}
        </button>}
        {shot < 2
          ? <button className="journey-button sumo-film-next" type="button" onClick={() => onShot(2)} disabled={!settled}>{tx('跳到仕切', 'Skip to ready')} <span aria-hidden="true">→</span></button>
          : <button className="journey-button journey-primary" id="sumo-enter" type="button" onClick={onPlay} disabled={!canPlay}>{tx('进入相扑', 'Play Sumo')} <span aria-hidden="true">→</span></button>}
      </div>
    </div>
  </section>;
}
