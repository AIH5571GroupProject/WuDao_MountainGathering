import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExperienceProps } from '../types';
import SumoScene, { type SceneRigInput } from './SumoScene';
import { WoodblockArt } from './SumoWoodblockArt';
import { SumoAudio } from './sumoAudio';
import {
  DOHYO_CODEX,
  KIMARITE_BOOK,
  MOVES,
  MOVE_ORDER,
  OPPONENTS,
  RANK_LADDER,
  TIMING,
  advanceFromSalt,
  buildCompletionResult,
  createInitialState,
  currentOpponent,
  earnedRank,
  enterTachiai,
  performClap,
  performSaltThrow,
  performShikoStomp,
  proceedAfterBout,
  rematchCurrentOpponent,
  selectOpponent,
  startTournament,
  stepGame,
  submitPlayerMove,
  triggerTachiaiCharge,
  winsCount,
  type KimariteId,
  type MoveId,
  type SumoGameState,
} from './sumoEngine';
import './sumo.css';

type CodexTab = 'dohyo' | 'kimarite' | 'banzuke';

const MOVE_KEYS: Record<string, MoveId> = {
  a: 'oshi',
  A: 'oshi',
  '1': 'oshi',
  ArrowLeft: 'oshi',
  s: 'yori',
  S: 'yori',
  '2': 'yori',
  ArrowDown: 'yori',
  d: 'hataki',
  D: 'hataki',
  '3': 'hataki',
  ArrowRight: 'hataki',
};

export default function Experience({
  language,
  quality,
  reducedMotion,
  paused,
  soundEnabled,
  onExit,
  onComplete,
}: ExperienceProps) {
  const [state, setState] = useState<SumoGameState>(createInitialState);
  const stateRef = useRef<SumoGameState>(state);
  stateRef.current = state;

  const [codexOpen, setCodexOpen] = useState(false);
  const [codexTab, setCodexTab] = useState<CodexTab>('dohyo');
  const [localSound, setLocalSound] = useState(soundEnabled);
  const [shikoCharging, setShikoCharging] = useState(false);

  const chargeFillRef = useRef<HTMLSpanElement | null>(null);
  const rigInputRef = useRef<SceneRigInput>({ shikoCharge: 0 });
  const shikoHoldRef = useRef(false);
  const shikoChargeValRef = useRef(0);
  const completedRef = useRef(false);
  const lastSoundSeqRef = useRef(0);

  const audio = useMemo(() => new SumoAudio(), []);
  const zh = language === 'zh';
  const tx = useCallback((cn: string, en: string) => (zh ? cn : en), [zh]);

  const apply = useCallback((updater: (prev: SumoGameState) => SumoGameState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  // Sync host sound prop into local toggle if user hasn't explicitly muted.
  useEffect(() => {
    setLocalSound(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audio.setEnabled(localSound);
  }, [audio, localSound]);

  useEffect(() => {
    if (paused) audio.suspend();
    else audio.resume();
  }, [audio, paused]);

  useEffect(() => () => audio.dispose(), [audio]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audio]);

  // Play synthesized sumo soundscapes whenever the engine emits a new event.
  useEffect(() => {
    if (state.eventSeq === lastSoundSeqRef.current) return;
    lastSoundSeqRef.current = state.eventSeq;
    const ev = state.lastEvent;
    if (ev === 'none') return;
    if (ev === 'tachiai_win') audio.play('clash_win', state.lastEventStrength);
    else if (ev === 'tachiai_miss') audio.play('clash_lose', state.lastEventStrength);
    else audio.play(ev, state.lastEventStrength);
  }, [audio, state.eventSeq, state.lastEvent, state.lastEventStrength]);

  // Report completion quietly when reaching the Banzuke verdict scroll.
  useEffect(() => {
    if (completedRef.current) return;
    if (state.mode !== 'banzuke' && state.history.length === 0) return;
    if (state.mode === 'banzuke') {
      completedRef.current = true;
      onComplete(buildCompletionResult(state, language));
    }
  }, [language, onComplete, state]);

  // Main animation frame loop driving engine timers & Shiko charge bar.
  const effectivelyPaused = paused || codexOpen;
  useEffect(() => {
    if (effectivelyPaused) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      const cur = stateRef.current;
      if (cur.mode === 'ritual_shiko') {
        if (shikoHoldRef.current) {
          shikoChargeValRef.current = Math.min(1, shikoChargeValRef.current + dt / TIMING.shikoChargeTime);
        } else {
          shikoChargeValRef.current = Math.max(0, shikoChargeValRef.current - dt * 5);
        }
        rigInputRef.current.shikoCharge = shikoChargeValRef.current;
        if (chargeFillRef.current) {
          chargeFillRef.current.style.transform = `scaleX(${shikoChargeValRef.current})`;
        }
      } else {
        shikoHoldRef.current = false;
        shikoChargeValRef.current = 0;
        rigInputRef.current.shikoCharge = 0;
      }

      if (cur.mode === 'tachiai' || cur.mode === 'bout' || cur.mode === 'kimarite_freeze') {
        apply((prev) => stepGame(prev, dt));
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [apply, effectivelyPaused]);

  const releaseShiko = useCallback(() => {
    if (!shikoHoldRef.current) return;
    shikoHoldRef.current = false;
    setShikoCharging(false);
    const power = shikoChargeValRef.current;
    shikoChargeValRef.current = 0;
    rigInputRef.current.shikoCharge = 0;
    if (chargeFillRef.current) chargeFillRef.current.style.transform = 'scaleX(0)';
    apply((prev) => performShikoStomp(prev, power));
  }, [apply]);

  const beginShikoHold = useCallback(() => {
    if (stateRef.current.mode !== 'ritual_shiko') return;
    audio.unlock();
    shikoHoldRef.current = true;
    setShikoCharging(true);
  }, [audio]);

  // Keyboard controls across every phase.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || effectivelyPaused) return;
      const cur = stateRef.current;

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        audio.unlock();
        if (cur.mode === 'title') {
          audio.play('hyoshigi', 0.85);
          apply((prev) => startTournament(prev, false));
        } else if (cur.mode === 'ritual_salt') {
          apply(performSaltThrow);
        } else if (cur.mode === 'ritual_shiko') {
          beginShikoHold();
        } else if (cur.mode === 'tachiai') {
          apply(triggerTachiaiCharge);
        } else if (cur.mode === 'bout_result') {
          apply(proceedAfterBout);
        }
        return;
      }

      if ((event.key === 'c' || event.key === 'C') && cur.mode === 'ritual_salt') {
        event.preventDefault();
        audio.unlock();
        apply(performClap);
        return;
      }

      if (event.key === 'Enter') {
        if (cur.mode === 'ritual_salt' && cur.salt.throws > 0) {
          apply(advanceFromSalt);
        } else if (cur.mode === 'ritual_shiko' && cur.shiko.stomps > 0) {
          audio.play('hyoshigi', 0.8);
          apply(enterTachiai);
        } else if (cur.mode === 'bout_result') {
          apply(proceedAfterBout);
        }
        return;
      }

      const move = MOVE_KEYS[event.key];
      if (move && cur.mode === 'bout') {
        event.preventDefault();
        audio.unlock();
        apply((prev) => submitPlayerMove(prev, move));
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Spacebar') {
        releaseShiko();
      }
    };

    const onBlur = () => {
      releaseShiko();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [apply, audio, beginShikoHold, effectivelyPaused, releaseShiko]);

  const opp = currentOpponent(state);
  const rank = earnedRank(state);
  const totalWins = winsCount(state);
  const bout = state.bout;
  const teleActive = state.mode === 'bout' && bout.phase === 'telegraph' && bout.opponentMove !== null;
  const teleProgress = teleActive
    ? Math.max(0, 1 - bout.phaseTimer / Math.max(0.1, bout.phaseDuration))
    : 0;
  const activeFinish = state.finish ? KIMARITE_BOOK[state.finish.kimarite] : null;

  return (
    <div className={`sumo-stage sumo-mode-${state.mode}`}>
      {/* Full-bleed sculpted 3D woodblock dohyo & wrestlers */}
      <div className="sumo-canvas">
        <SumoScene
          state={state}
          paused={effectivelyPaused}
          quality={quality}
          reducedMotion={reducedMotion}
          rigInputRef={rigInputRef}
        />
      </div>

      {/* Subtle corner utility controls (never clashes with host ExperiencePortal top bar) */}
      <div className="sumo-corner-tools">
        <button
          className={`sumo-chip ${localSound ? 'is-active' : ''}`}
          onClick={() => {
            audio.unlock();
            setLocalSound((v) => !v);
          }}
          aria-pressed={localSound}
        >
          {localSound ? tx('太鼓音 · 开', 'Taiko · On') : tx('太鼓音 · 关', 'Taiko · Off')}
        </button>
        <button
          className={`sumo-chip ${codexOpen ? 'is-active' : ''}`}
          onClick={() => {
            audio.unlock();
            audio.play('ui', 0.45);
            setCodexOpen((v) => !v);
          }}
          aria-expanded={codexOpen}
        >
          {tx('相扑志 · 图鉴', 'Cultural Codex')}
        </button>
      </div>

      {/* =====================================================================
          MODE 1: TITLE CURTAIN
         ===================================================================== */}
      {state.mode === 'title' && (
        <section className="sumo-overlay sumo-title-screen" aria-label={tx('相扑大地席', 'Sumo Earth Ring')}>
          <div className="sumo-title-card">
            <div className="sumo-title-crest">
              <WoodblockArt artKey="banzuke-crest" alt={tx('横纲注连绳与军配', 'Yokozuna tsuna and gunbai')} />
            </div>
            <p className="sumo-kicker">05 · SUMO · GRAND BASHO</p>
            <h1>{tx('大地席 · 相扑', 'Earth Ring · Sumo')}</h1>
            <p className="sumo-lead">
              {tx(
                '先净场、踏四股、立合对峙，再于三场本场所决胜推、寄、避三法，问鼎横纲番付。',
                'Purify the clay, stomp shiko, lock breath at tachiai, then face three escalating champions to claim your Banzuke rank.',
              )}
            </p>
            <div className="sumo-ladder-preview">
              {OPPONENTS.map((o, idx) => (
                <div key={o.id} className="sumo-ladder-pill">
                  <span>0{idx + 1}</span>
                  <b>{o.shikona[language]}</b>
                  <i>{o.rankLabel[language]}</i>
                </div>
              ))}
            </div>
            <div className="sumo-title-actions">
              <button
                className="sumo-btn-primary"
                onClick={() => {
                  audio.unlock();
                  audio.play('hyoshigi', 0.85);
                  apply((prev) => startTournament(prev, false));
                }}
              >
                {tx('登台净场 · 开启本场所', 'Enter the Dohyo · Ritual & Basho')}
              </button>
              <button
                className="sumo-btn-ghost"
                onClick={() => {
                  audio.unlock();
                  audio.play('hyoshigi', 0.75);
                  apply((prev) => startTournament(prev, true));
                }}
              >
                {tx('跳过仪式 · 直入立合', 'Skip Rituals · Quick Bout')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 2A: CEREMONIAL PRELUDE — SALT & CHIRICHŌZU
         ===================================================================== */}
      {state.mode === 'ritual_salt' && (
        <section className="sumo-ritual-hud">
          <header className="sumo-ritual-head">
            <span className="sumo-step-pill">{tx('仪轨 一 / 三 · 净场', 'RITE 1 / 3 · PURIFICATION')}</span>
            <h2>{tx('尘手水与清盐', 'Chirichōzu & Purifying Salt')}</h2>
            <p>
              {tx(
                '拍手翻掌，示手中无刃；抓一把清盐抛向土俵，净场驱邪，也为对手祈无伤。',
                'Clap and turn empty palms to show no weapon; cast salt across the clay to cleanse the sacred ground.',
              )}
            </p>
          </header>

          <div className="sumo-ritual-controls">
            <button
              className={`sumo-seal-btn ${state.salt.clapped ? 'is-done' : ''}`}
              onClick={() => {
                audio.unlock();
                apply(performClap);
              }}
            >
              <em>C</em>
              <b>{tx('行尘手水 · 拍手', 'Chirichōzu · Clap')}</b>
              <span>{state.salt.clapped ? tx('已完成', 'Performed') : tx('示手中无刃', 'Open empty palms')}</span>
            </button>

            <button
              className={`sumo-seal-btn is-vermilion ${state.salt.throws > 0 ? 'is-done' : ''}`}
              onClick={() => {
                audio.unlock();
                apply(performSaltThrow);
              }}
            >
              <em>SPACE</em>
              <b>{tx('撒盐净场', 'Scatter Salt')}</b>
              <span>
                {state.salt.throws > 0
                  ? tx(`已撒 ${state.salt.throws} 把 · 气势初聚`, `${state.salt.throws} cast · Ring purified`)
                  : tx('清めの塩 · 祈无伤', 'Purify the sacred clay')}
              </span>
            </button>

            <button
              className="sumo-btn-primary"
              onClick={() => {
                audio.unlock();
                audio.play('ui', 0.6);
                apply(advanceFromSalt);
              }}
            >
              {state.salt.throws > 0
                ? tx('下一步 · 踏四股 →', 'Next · Stomp Shiko →')
                : tx('略过此礼 →', 'Continue →')}
            </button>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 2B: CEREMONIAL PRELUDE — SHIKO STOMP
         ===================================================================== */}
      {state.mode === 'ritual_shiko' && (
        <section className="sumo-ritual-hud">
          <header className="sumo-ritual-head">
            <span className="sumo-step-pill">{tx('仪轨 二 / 三 · 锻体', 'RITE 2 / 3 · GROUNDING')}</span>
            <h2>{tx('四股重踏', 'Shiko · Stamp the Earth')}</h2>
            <p>
              {tx(
                '按住蓄力将腿高举过腰，松手重踏土俵。踏得越沉，开场气势越盛。',
                'Hold to lift the leg high, release to drive the sole into clay. A deeper stomp grants stronger opening spirit.',
              )}
            </p>
          </header>

          <div className="sumo-shiko-panel">
            <div className="sumo-charge-track">
              <span ref={chargeFillRef} className="sumo-charge-fill" />
            </div>
            <div className="sumo-shiko-meta">
              <span>
                {tx(
                  `已踏 ${state.shiko.stomps} 次 · 蓄势加成 +${Math.round(state.shiko.bestPower * 45)}%`,
                  `${state.shiko.stomps} stomps · Spirit Bonus +${Math.round(state.shiko.bestPower * 45)}%`,
                )}
              </span>
            </div>
            <div className="sumo-ritual-controls">
              <button
                className={`sumo-seal-btn is-vermilion ${shikoCharging ? 'is-charging' : ''}`}
                onPointerDown={beginShikoHold}
                onPointerUp={releaseShiko}
                onPointerLeave={releaseShiko}
                onPointerCancel={releaseShiko}
              >
                <em>HOLD / SPACE</em>
                <b>{shikoCharging ? tx('蓄力抬腿中…松手重踏！', 'Lifting… Release to Stamp!') : tx('按住抬腿 · 松手重踏', 'Hold to Lift · Release to Stamp')}</b>
                <span>{tx(state.shiko.foot === 'left' ? '左足蓄势' : '右足蓄势', `${state.shiko.foot} leg ready`)}</span>
              </button>

              <button
                className="sumo-btn-primary"
                onClick={() => {
                  audio.unlock();
                  audio.play('hyoshigi', 0.85);
                  apply(enterTachiai);
                }}
              >
                {tx('进入立合 · 迎战雷山 →', 'Enter Tachiai · Face Raizan →')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 3: TACHIAI STARE-DOWN
         ===================================================================== */}
      {state.mode === 'tachiai' && (
        <section
          className="sumo-tachiai-overlay"
          onClick={() => {
            audio.unlock();
            apply(triggerTachiaiCharge);
          }}
        >
          <div className="sumo-letterbox sumo-letterbox-top">
            <div className="sumo-match-card">
              <span className="sumo-bout-badge">
                {tx(`第 ${state.opponentIndex + 1} 场 / 3`, `BOUT ${state.opponentIndex + 1} / 3`)}
              </span>
              <strong>
                {opp.rankLabel[language]} · {opp.shikona[language]}
              </strong>
              <small>{opp.styleTag[language]}</small>
            </div>
            <p className="sumo-opp-tip">{opp.intro[language]}</p>
          </div>

          <div className="sumo-tachiai-center">
            {state.tachiai.phase === 'waiting' && (
              <div className="sumo-gyoji-banner is-waiting">
                <span className="sumo-jp-call">見合って… 見合って…</span>
                <b>{tx('双拳触地 · 静候行司发令', 'Fists to clay — wait for the call…')}</b>
              </div>
            )}
            {state.tachiai.phase === 'matta' && (
              <div className="sumo-gyoji-banner is-matta">
                <span className="sumo-jp-call">待った！</span>
                <b>{tx('抢跑犯规（待った）！深呼吸重新对峙', 'MATTA! False start — reset your breath')}</b>
              </div>
            )}
            {state.tachiai.phase === 'hakkeyoi' && (
              <div className="sumo-gyoji-banner is-go">
                <span className="sumo-jp-call">はっけよい！</span>
                <b>{tx('立合起冲！立刻按 空格 或 点击画面！', 'HAKKEYOI! PRESS SPACE OR CLICK NOW!')}</b>
              </div>
            )}
          </div>

          <div className="sumo-letterbox sumo-letterbox-bottom">
            <span>
              {tx('立合要诀：听到「はっけよい」瞬间出击，先夺重心优势', 'Tachiai tip: Strike the instant HAKKEYOI flashes to seize early momentum')}
            </span>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 4: LIVE PLAYABLE SUMO BOUT
         ===================================================================== */}
      {state.mode === 'bout' && (
        <>
          {/* Top Torikumi Broadcast HUD */}
          <header className="sumo-bout-hud">
            <div className="sumo-fighter-panel is-east">
              <div className="sumo-fighter-head">
                <span className="sumo-side-tag">{tx('东 · 挑战者', 'EAST · YOU')}</span>
                <b>{tx('重心', 'Balance')} {Math.round(bout.playerBalance)}%</b>
              </div>
              <div className="sumo-bar-track">
                <div className="sumo-bar-fill is-east" style={{ width: `${bout.playerBalance}%` }} />
              </div>
            </div>

            {/* Center Dohyo Ring Position Meter */}
            <div className="sumo-ring-meter" aria-label={tx('土俵位置', 'Ring position')}>
              <div className="sumo-ring-labels">
                <span>{tx('东俵', 'East Edge')}</span>
                <b>{tx(`第 ${state.opponentIndex + 1} 番 · ${opp.shikona[language]}`, `Bout ${state.opponentIndex + 1} · ${opp.shikona[language]}`)}</b>
                <span>{tx('西俵', 'West Edge')}</span>
              </div>
              <div className="sumo-ring-track">
                <span className="sumo-ring-midline" />
                <span
                  className={`sumo-ring-puck ${Math.abs(bout.ringPos) > 0.65 ? 'is-danger' : ''}`}
                  style={{ left: `${50 + bout.ringPos * 46}%` }}
                />
              </div>
            </div>

            <div className="sumo-fighter-panel is-west">
              <div className="sumo-fighter-head">
                <b>{Math.round(bout.opponentBalance)}% {tx('重心', 'Balance')}</b>
                <span className="sumo-side-tag">
                  {opp.rankLabel[language]} · {opp.shikona[language]}
                </span>
              </div>
              <div className="sumo-bar-track">
                <div className="sumo-bar-fill is-west" style={{ width: `${bout.opponentBalance}%` }} />
              </div>
            </div>
          </header>

          {/* Center Telegraph & Clash Feedback Strip */}
          <div className="sumo-battle-callout" aria-live="polite">
            {teleActive && bout.opponentMove && (
              <div className={`sumo-telegraph-card is-move-${bout.opponentMove}`}>
                <div className="sumo-telegraph-row">
                  <span className="sumo-telegraph-badge">{MOVES[bout.opponentMove].kanji}</span>
                  <div>
                    <strong>{MOVES[bout.opponentMove].tellCue[language]}</strong>
                    <small>
                      {bout.opponentMove === 'oshi'
                        ? tx('克制提示：按 D / 3 「避 · 叩込」借势拍落！', 'Counter: Press D / 3 (Sidestep · Hataki)!')
                        : bout.opponentMove === 'yori'
                          ? tx('克制提示：按 A / 1 「推 · 押出」双掌破架！', 'Counter: Press A / 1 (Thrust · Oshi)!')
                          : tx('克制提示：按 S / 2 「寄 · 上手投」扣带反摔！', 'Counter: Press S / 2 (Grip-Throw · Yori)!')}
                    </small>
                  </div>
                </div>
                <div className="sumo-telegraph-timer">
                  <i style={{ transform: `scaleX(${teleProgress})` }} />
                </div>
              </div>
            )}

            {bout.phase === 'resolve' && bout.lastOutcome !== 'none' && (
              <div className={`sumo-clash-stamp is-${bout.lastOutcome}`}>
                {bout.lastOutcome === 'win' && (
                  <>
                    <b>{tx('破势得手！', 'CLEAN COUNTER!')}</b>
                    <span>{bout.streak > 1 ? tx(`${bout.streak} 连破！乘胜逼近稻草俵`, `${bout.streak}x Momentum! Press the advantage`) : tx('重心压制！', 'Centre seized!')}</span>
                  </>
                )}
                {bout.lastOutcome === 'lose' && (
                  <>
                    <b>{tx('重心受挫！', 'GUARD BROKEN!')}</b>
                    <span>{tx('稳住下盘，读清下一招起手', 'Anchor your stance and read the next wind-up')}</span>
                  </>
                )}
                {bout.lastOutcome === 'even' && (
                  <>
                    <b>{tx('力均相持！', 'LOCKED EVEN!')}</b>
                    <span>{tx('势均力敌，静待破绽', 'Even force — watch the next shift')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom 3 Tactical Sumo Move Seals */}
          <div className="sumo-combat-deck">
            <div className="sumo-triangle-hint">
              {tx('相克循环：推 克 寄 · 寄 克 避 · 避 克 推', 'Triangle: Thrust > Grip · Grip > Sidestep · Sidestep > Thrust')}
            </div>
            <div className="sumo-move-row">
              {MOVE_ORDER.map((id) => {
                const m = MOVES[id];
                const isRecommended =
                  teleActive &&
                  bout.opponentMove !== null &&
                  MOVES[id].beats === bout.opponentMove;
                const isSelected = bout.phase === 'resolve' && bout.playerMove === id;
                return (
                  <button
                    key={id}
                    className={`sumo-move-seal is-${id} ${isRecommended ? 'is-counter-ready' : ''} ${isSelected ? 'is-picked' : ''}`}
                    disabled={!teleActive}
                    onClick={() => {
                      audio.unlock();
                      apply((prev) => submitPlayerMove(prev, id));
                    }}
                  >
                    <span className="sumo-move-key">{m.keyHint}</span>
                    <div className="sumo-move-title">
                      <span className="sumo-move-kanji">{m.kanji}</span>
                      <div>
                        <b>{m.name[language]}</b>
                        <small>{m.shortDesc[language]}</small>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          MODE 5: KIMARITE FREEZE-FRAME WOODBLOCK CUT-IN
         ===================================================================== */}
      {state.mode === 'kimarite_freeze' && state.finish && activeFinish && (
        <section className="sumo-kimarite-cutin" aria-live="assertive">
          <div className="sumo-cutin-inner">
            <div className="sumo-cutin-art">
              <WoodblockArt artKey={activeFinish.id} alt={activeFinish.name[language]} />
            </div>
            <div className="sumo-cutin-copy">
              <span className={`sumo-verdict-tag ${state.finish.winner === 'player' ? 'is-win' : 'is-lose'}`}>
                {state.finish.winner === 'player'
                  ? tx('胜负已分 · 东方胜', 'SHŌBU ARI · EAST WINS')
                  : tx('胜负已分 · 西方胜', 'SHŌBU ARI · WEST WINS')}
              </span>
              <p className="sumo-cutin-cat">{activeFinish.category[language]}</p>
              <h2>
                {activeFinish.kanji} <em>{activeFinish.reading}</em>
              </h2>
              <p className="sumo-cutin-poem">{activeFinish.calligraphyLine[language]}</p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 6: BOUT RESULT CARD
         ===================================================================== */}
      {state.mode === 'bout_result' && state.finish && activeFinish && (
        <section className="sumo-overlay">
          <div className="sumo-result-card">
            <div className="sumo-result-art">
              <WoodblockArt artKey={activeFinish.id} alt={activeFinish.name[language]} />
            </div>
            <div className="sumo-result-body">
              <span className={`sumo-verdict-tag ${state.finish.winner === 'player' ? 'is-win' : 'is-lose'}`}>
                {state.finish.winner === 'player'
                  ? tx(`第 ${state.opponentIndex + 1} 番 胜出 · 击败 ${opp.shikona.zh}`, `Bout ${state.opponentIndex + 1} Victory · Defeated ${opp.shikona.en}`)
                  : tx(`第 ${state.opponentIndex + 1} 番 惜败 · 负于 ${opp.shikona.zh}`, `Bout ${state.opponentIndex + 1} Defeat · Bested by ${opp.shikona.en}`)}
              </span>
              <h2>
                {tx('决手：', 'Kimarite: ')}
                {activeFinish.name[language]} ({activeFinish.reading})
              </h2>
              <p className="sumo-result-desc">{activeFinish.explanation[language]}</p>

              <div className="sumo-result-stats">
                <div>
                  <span>{tx('立合反应', 'Tachiai')}</span>
                  <b>
                    {state.tachiai.grade === 'perfect'
                      ? tx('绝佳', 'Perfect')
                      : state.tachiai.grade === 'good'
                        ? tx('稳健', 'Solid')
                        : tx('迟滞', 'Late')}
                  </b>
                </div>
                <div>
                  <span>{tx('破势回合', 'Counters')}</span>
                  <b>
                    {bout.clashesWon} / {Math.max(1, bout.clashesTotal)}
                  </b>
                </div>
                <div>
                  <span>{tx('本场所战绩', 'Basho Record')}</span>
                  <b>
                    {totalWins} / 3
                  </b>
                </div>
              </div>

              <div className="sumo-result-actions">
                {state.finish.winner === 'player' && state.opponentIndex < 2 ? (
                  <button
                    className="sumo-btn-primary"
                    onClick={() => {
                      audio.unlock();
                      audio.play('hyoshigi', 0.85);
                      apply(proceedAfterBout);
                    }}
                  >
                    {tx(
                      `迎战下一位 · ${OPPONENTS[state.opponentIndex + 1].rankLabel.zh} ${OPPONENTS[state.opponentIndex + 1].shikona.zh} →`,
                      `Next Opponent · ${OPPONENTS[state.opponentIndex + 1].shikona.en} →`,
                    )}
                  </button>
                ) : (
                  <button
                    className="sumo-btn-primary"
                    onClick={() => {
                      audio.unlock();
                      audio.play('hyoshigi', 0.85);
                      apply(proceedAfterBout);
                    }}
                  >
                    {tx('揭晓番付表 · 查看授阶 →', 'Unroll Banzuke Verdict →')}
                  </button>
                )}

                <button
                  className="sumo-btn-ghost"
                  onClick={() => {
                    audio.unlock();
                    audio.play('ui', 0.6);
                    apply(rematchCurrentOpponent);
                  }}
                >
                  {tx('再战本场', 'Rematch')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 7: BANZUKE VERDICT SCROLL
         ===================================================================== */}
      {state.mode === 'banzuke' && (
        <section className="sumo-overlay">
          <div className="sumo-banzuke-scroll">
            <div className="sumo-banzuke-crest">
              <WoodblockArt artKey="banzuke-crest" alt={tx('番付徽记', 'Banzuke crest')} />
            </div>
            <p className="sumo-kicker">GRAND BASHO · BANZUKE VERDICT</p>
            <div className="sumo-rank-stamp">
              <span>{tx('授阶', 'RANK AWARDED')}</span>
              <h2>{rank.name[language]}</h2>
              <em>{rank.romaji}</em>
            </div>
            <p className="sumo-rank-desc">{rank.description[language]}</p>

            <div className="sumo-ledger">
              {OPPONENTS.map((o, idx) => {
                const rec = state.history.find((h) => h.opponentIndex === idx);
                return (
                  <div key={o.id} className={`sumo-ledger-row ${rec ? (rec.won ? 'is-win' : 'is-lose') : ''}`}>
                    <span>0{idx + 1}</span>
                    <b>
                      {o.shikona[language]} · <i>{o.rankLabel[language]}</i>
                    </b>
                    <em>
                      {rec
                        ? `${rec.won ? tx('胜', 'WIN') : tx('负', 'LOSS')} · ${KIMARITE_BOOK[rec.kimarite].name[language]}`
                        : tx('未交锋', 'Not fought')}
                    </em>
                    <button
                      className="sumo-ledger-fight"
                      onClick={() => {
                        audio.unlock();
                        audio.play('hyoshigi', 0.75);
                        apply((prev) => selectOpponent(prev, idx as 0 | 1 | 2));
                      }}
                    >
                      {tx('挑战', 'Bout')}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="sumo-title-actions">
              <button
                className="sumo-btn-primary"
                onClick={() => {
                  audio.unlock();
                  audio.play('hyoshigi', 0.85);
                  apply((prev) => startTournament(prev, false));
                }}
              >
                {tx('重开本场所（含净场仪式）', 'New Basho (With Rituals)')}
              </button>
              <button className="sumo-btn-ghost" onClick={onExit}>
                {tx('返回相扑篇章', 'Return to Chapter')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          COLLAPSIBLE CULTURAL CODEX DRAWER (Closed by default)
         ===================================================================== */}
      <aside className={`sumo-codex ${codexOpen ? 'is-open' : ''}`} aria-hidden={!codexOpen}>
        <div className="sumo-codex-head">
          <div>
            <span>CULTURAL CODEX</span>
            <h3>{tx('相扑志 · 礼与技', 'Sumo · Ritual & Craft')}</h3>
          </div>
          <button
            className="sumo-codex-close"
            onClick={() => setCodexOpen(false)}
            aria-label={tx('关闭图鉴', 'Close codex')}
          >
            ✕
          </button>
        </div>

        <nav className="sumo-codex-tabs">
          {(
            [
              ['dohyo', tx('土俵神域', 'Dohyo')],
              ['kimarite', tx('决手图鉴', 'Kimarite')],
              ['banzuke', tx('番付阶位', 'Banzuke')],
            ] as const
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              className={codexTab === tabId ? 'is-on' : ''}
              onClick={() => setCodexTab(tabId)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sumo-codex-body">
          {codexTab === 'dohyo' &&
            DOHYO_CODEX.map((item) => (
              <article key={item.id} className="sumo-codex-card">
                <span>{item.tag[language]}</span>
                <h4>{item.title[language]}</h4>
                <p>{item.body[language]}</p>
              </article>
            ))}

          {codexTab === 'kimarite' &&
            (Object.keys(KIMARITE_BOOK) as KimariteId[]).map((kid) => {
              const k = KIMARITE_BOOK[kid];
              return (
                <article key={kid} className="sumo-codex-card is-kimarite">
                  <div className="sumo-codex-thumb">
                    <WoodblockArt artKey={kid} alt={k.name[language]} />
                  </div>
                  <span>{k.category[language]}</span>
                  <h4>
                    {k.name[language]} · <i>{k.reading}</i>
                  </h4>
                  <p>{k.explanation[language]}</p>
                </article>
              );
            })}

          {codexTab === 'banzuke' &&
            RANK_LADDER.map((r, i) => (
              <article key={r.id} className="sumo-codex-card">
                <span>
                  0{i + 1} · {r.badge[language]}
                </span>
                <h4>
                  {r.name[language]} · <i>{r.romaji}</i>
                </h4>
                <p>{r.description[language]}</p>
              </article>
            ))}
        </div>
      </aside>

      {paused && <div className="sumo-paused">{tx('已暂停', 'Paused')}</div>}
    </div>
  );
}
