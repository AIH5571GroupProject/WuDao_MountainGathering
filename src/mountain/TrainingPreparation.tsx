import { trainingFilms, type TrainingFilmId } from './trainingFilm';

type Props = {
  arenaId: TrainingFilmId;
  gameAvailable: boolean;
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

export function TrainingPreparation({ arenaId, gameAvailable, language, shot, settled, paused, fallback, onShot, onPause, onPlay, onBack }: Props) {
  const tx = (zh: string, en: string) => language === 'zh' ? zh : en;
  const boxing = arenaId === 'boxing';
  const { shots } = trainingFilms[arenaId];
  const frame = shots[shot];
  const last = shot === shots.length - 1;
  const titleId = `${arenaId}-title`;
  return <section className="sumo-preparation" aria-labelledby={titleId} lang={language === 'zh' ? 'zh-CN' : 'en'} data-arena={arenaId} data-shot={shot}>
    <div className="sumo-film-frame" aria-hidden="true" />
    <div className="sumo-film-title">
      <p className="overline">{boxing ? '04 / 06 · BOXING' : '05 / 06 · SUMO'}</p>
      <h1 id={titleId}>{boxing ? tx('拳击', 'Boxing') : tx('相扑', 'Sumo')}</h1>
      <button className="journey-button" type="button" onClick={onBack}><span aria-hidden="true">←</span>{tx('返回山图', 'Back to mountain')}</button>
    </div>
    <div className="sumo-film-rail">
      <div className="sumo-film-copy" aria-live="polite">
        <h2>{tx(frame.title, frame.en)}</h2>
        <p>{tx(frame.caption, frame.captionEn)}</p>
        {'credit' in frame && <p className="boxing-film-credit">{tx('取景参考', 'Framing reference')} · {tx(frame.credit, frame.creditEn)}</p>}
        {boxing && last && !gameAvailable && <p className="boxing-availability">{tx('拳击游戏筹备中', 'Boxing game in development')}</p>}
        {fallback && <p>{tx('三维画面暂不可用，仍可打开入口。', 'The 3D sequence is unavailable. You can still open the entry screen.')}</p>}
      </div>
      <div className="sumo-film-actions">
        <div className="sumo-film-shots" role="group" aria-label={tx('选择镜头', 'Choose a shot')}>
          {shots.map((item, index) => <button className="journey-button" key={item.title} type="button"
            onClick={() => onShot(index)} aria-pressed={shot === index} disabled={!settled}><small aria-hidden="true">0{index + 1}</small>{tx(item.title, item.en)}</button>)}
        </div>
        {!fallback && !(boxing && last) && <button className="journey-button sumo-film-pause" type="button" onClick={onPause} disabled={!settled}>
          {last ? (paused ? tx('恢复动效', 'Resume motion') : tx('暂停动效', 'Pause motion')) : (paused ? tx('继续', 'Play') : tx('暂停', 'Pause'))}
        </button>}
        {!last
          ? <button className="journey-button sumo-film-next" type="button" onClick={() => onShot(shots.length - 1)} disabled={!settled}>{boxing ? tx('跳到蓄势', 'Skip to strength') : tx('跳到仕切', 'Skip to ready')} <span aria-hidden="true">→</span></button>
          : <button className="journey-button journey-primary" id={`${arenaId}-enter`} type="button" onClick={onPlay} disabled={!settled}>{boxing ? tx('进入拳击', 'Enter Boxing') : tx('进入相扑', 'Play Sumo')} <span aria-hidden="true">→</span></button>}
      </div>
    </div>
  </section>;
}
