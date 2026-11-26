import { describe, expect, it } from 'vitest';
import {
  OPPONENTS,
  TIMING,
  advanceFromSalt,
  buildCompletionResult,
  counterFor,
  createInitialState,
  currentOpponent,
  earnedRank,
  enterTachiai,
  evaluateTriangle,
  performClap,
  performSaltThrow,
  performShikoStomp,
  proceedAfterBout,
  rematchCurrentOpponent,
  startTournament,
  stepGame,
  submitPlayerMove,
  triggerTachiaiCharge,
  winsCount,
} from '../src/experiences/sumo/sumoEngine';
import { choreographUkiyoFrame } from '../src/experiences/sumo/sumoUkiyoPose';

describe('05 Sumo · Earth Ring bout & ritual engine', () => {
  it('evaluates the tactical sumo triangle correctly (oshi > yori > hataki > oshi)', () => {
    expect(evaluateTriangle('oshi', 'yori')).toBe('win');
    expect(evaluateTriangle('yori', 'hataki')).toBe('win');
    expect(evaluateTriangle('hataki', 'oshi')).toBe('win');

    expect(evaluateTriangle('yori', 'oshi')).toBe('lose');
    expect(evaluateTriangle('hataki', 'yori')).toBe('lose');
    expect(evaluateTriangle('oshi', 'hataki')).toBe('lose');

    expect(evaluateTriangle('oshi', 'oshi')).toBe('even');
    expect(evaluateTriangle('yori', 'yori')).toBe('even');
    expect(evaluateTriangle('hataki', 'hataki')).toBe('even');
  });

  it('walks through ceremonial rituals (salt + clap -> shiko -> tachiai) and grants spirit bonus', () => {
    let s = createInitialState();
    expect(s.mode).toBe('title');

    s = startTournament(s, false);
    expect(s.mode).toBe('ritual_salt');

    s = performClap(s);
    expect(s.salt.clapped).toBe(true);
    expect(s.lastEvent).toBe('clap');

    s = performSaltThrow(s);
    expect(s.salt.throws).toBe(1);
    expect(s.lastEvent).toBe('salt');

    s = advanceFromSalt(s);
    expect(s.mode).toBe('ritual_shiko');

    const weak = performShikoStomp(s, 0.1);
    expect(weak.shiko.stomps).toBe(0);
    expect(weak.lastEvent).toBe('shiko_light');

    s = performShikoStomp(s, 0.9);
    expect(s.shiko.stomps).toBe(1);
    expect(s.shiko.foot).toBe('right');
    expect(s.lastEvent).toBe('shiko_heavy');

    s = enterTachiai(s);
    expect(s.mode).toBe('tachiai');
    expect(s.bout.spirit).toBeGreaterThan(0.5);
  });

  it('triggers Matta on early tachiai press and rewards perfect Hakkeyoi timing', () => {
    let s = startTournament(createInitialState(), true);
    expect(s.mode).toBe('tachiai');
    expect(s.tachiai.phase).toBe('waiting');

    // Early press -> Matta false start
    s = triggerTachiaiCharge(s);
    expect(s.tachiai.phase).toBe('matta');
    expect(s.tachiai.mattaCount).toBe(1);
    expect(s.lastEvent).toBe('matta');

    // Advance past Matta cooldown and wait duration until Hakkeyoi
    for (let i = 0; i < 80 && s.tachiai.phase !== 'hakkeyoi'; i += 1) {
      s = stepGame(s, 0.05);
    }
    expect(s.tachiai.phase).toBe('hakkeyoi');

    // Immediate press inside perfect window
    s = stepGame(s, 0.04);
    s = triggerTachiaiCharge(s);
    expect(s.mode).toBe('bout');
    expect(s.tachiai.grade).toBe('perfect');
    expect(s.bout.ringPos).toBeGreaterThan(0.2);
  });

  it('punishes missed Tachiai window by giving opponent initial momentum', () => {
    let s = startTournament(createInitialState(), true);
    for (let i = 0; i < 60 && s.tachiai.phase !== 'hakkeyoi'; i += 1) {
      s = stepGame(s, 0.05);
    }
    expect(s.tachiai.phase).toBe('hakkeyoi');

    for (let i = 0; i < 20 && s.mode === 'tachiai'; i += 1) {
      s = stepGame(s, 0.05);
    }
    expect(s.mode).toBe('bout');
    expect(s.tachiai.grade).toBe('missed');
    expect(s.bout.ringPos).toBeLessThan(0);
  });

  it('lets a player win all 3 Mini-Basho bouts by countering telegraphed moves and earn Yokozuna', () => {
    let s = startTournament(createInitialState(), true);

    for (let boutIdx = 0; boutIdx < 3; boutIdx += 1) {
      expect(s.opponentIndex).toBe(boutIdx);
      expect(currentOpponent(s).id).toBe(OPPONENTS[boutIdx].id);

      // Wait for Hakkeyoi & launch perfect Tachiai
      for (let i = 0; i < 60 && s.tachiai.phase !== 'hakkeyoi'; i += 1) {
        s = stepGame(s, 0.05);
      }
      s = triggerTachiaiCharge(s);
      expect(s.mode).toBe('bout');

      // Counter every telegraphed move until Kimarite freeze triggers
      let guard = 0;
      while (s.mode === 'bout' && guard < 400) {
        guard += 1;
        if (s.bout.phase === 'telegraph' && s.bout.opponentMove) {
          s = submitPlayerMove(s, counterFor(s.bout.opponentMove));
        } else {
          s = stepGame(s, 0.05);
        }
      }

      expect(s.mode).toBe('kimarite_freeze');
      expect(s.finish?.winner).toBe('player');

      // Advance past freeze-frame into bout_result
      for (let i = 0; i < 60 && s.mode === 'kimarite_freeze'; i += 1) {
        s = stepGame(s, 0.05);
      }
      expect(s.mode).toBe('bout_result');

      // Proceed to next opponent (or Banzuke after Yokozuna)
      s = proceedAfterBout(s);
    }

    expect(s.mode).toBe('banzuke');
    expect(winsCount(s)).toBe(3);
    expect(earnedRank(s).id).toBe('yokozuna');
    const summary = buildCompletionResult(s, 'zh');
    expect(summary.completed).toBe(true);
    expect(summary.summary).toContain('横纲');
  });

  it('triggers opponent victory when player ignores telegraphs and allows clean rematch', () => {
    let s = startTournament(createInitialState(), true);
    for (let i = 0; i < 80 && s.mode === 'tachiai'; i += 1) {
      s = stepGame(s, 0.05);
    }
    expect(s.mode).toBe('bout');

    let guard = 0;
    while (s.mode === 'bout' && guard < 600) {
      guard += 1;
      s = stepGame(s, 0.05);
    }

    expect(s.mode).toBe('kimarite_freeze');
    expect(s.finish?.winner).toBe('opponent');

    // Step into bout_result and rematch
    s = stepGame(s, TIMING.kimariteFreezeDuration + 1);
    // stepGame clamps delta to 0.05s, so loop it cleanly
    for (let i = 0; i < 60 && s.mode === 'kimarite_freeze'; i += 1) {
      s = stepGame(s, 0.05);
    }
    expect(s.mode).toBe('bout_result');
    s = rematchCurrentOpponent(s);
    expect(s.mode).toBe('tachiai');
    expect(s.bout.ringPos).toBe(0);
    expect(s.bout.playerBalance).toBe(100);
  });

  it('maintains non-overlapping Ukiyo-e skeleton separation, authentic Shiko lift, and live Gyōji cues', () => {
    // Tachiai low crouch: heads cleanly separated and fists planted low near clay
    const tachiai = startTournament(createInitialState(), true);
    const tFrame = choreographUkiyoFrame(tachiai, 0.5, 0, 1, 1, 0);
    expect(Math.abs(tFrame.opponent.head.x - tFrame.player.head.x)).toBeGreaterThan(0.55);
    expect(tFrame.player.armNear[2].y).toBeLessThan(0.35);

    // Shiko high leg lift: lifted foot rises high while planted foot stays grounded on clay
    let shiko = startTournament(createInitialState(), false);
    shiko = advanceFromSalt(shiko);
    const sFrame = choreographUkiyoFrame(shiko, 0.5, 1.0, 1, 1, 0);
    expect(sFrame.player.legFar[2].y).toBeGreaterThan(0.8);
    expect(sFrame.player.legNear[2].y).toBeLessThan(0.15);

    // Live bout separation & Gyōji tracking
    let bout = tachiai;
    for (let i = 0; i < 60 && bout.tachiai.phase !== 'hakkeyoi'; i += 1) {
      bout = stepGame(bout, 0.05);
    }
    bout = triggerTachiaiCharge(bout);
    const bFrame = choreographUkiyoFrame(bout, 1.2, 0, 1, 1, 0);
    expect(Math.abs(bFrame.opponent.pelvis.x - bFrame.player.pelvis.x)).toBeGreaterThan(1.0);
    expect(bFrame.gyoji.gunbaiAngle).toBeLessThan(0);
  });
});
