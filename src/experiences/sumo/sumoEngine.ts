/**
 * 05 Sumo · 大地席 (Earth Ring) — Pure game, ritual & cultural engine.
 *
 * Zero DOM / Three.js imports so every transition, combat exchange, AI tell,
 * balance shift, ring-out and Banzuke rank calculation is deterministic and
 * unit-testable.
 */

import type { ExperienceResult } from '../types';

export const SUMO_PALETTE = {
  paper: '#e9ecdf',
  ink: '#253422',
  inkSoft: '#3f4d39',
  matcha: '#829274',
  clay: '#b5aa8c',
  earth: '#9c8772',
  timber: '#5a4636',
  vermilion: '#b8432e',
  gold: '#b89448',
  salt: '#fbfdf9',
} as const;

export type Bilingual = { zh: string; en: string };

export type MoveId = 'oshi' | 'yori' | 'hataki';
export type KimariteId = 'oshidashi' | 'yorikiri' | 'uwatenage' | 'hatakikomi';
export type RankId = 'makushita' | 'maegashira' | 'sanyaku' | 'ozeki' | 'yokozuna';

export type StageMode =
  | 'title'
  | 'ritual_salt'
  | 'ritual_shiko'
  | 'tachiai'
  | 'bout'
  | 'kimarite_freeze'
  | 'bout_result'
  | 'banzuke';

export type ClashOutcome = 'win' | 'lose' | 'even' | 'brace' | 'none';

export type OpponentProfile = {
  index: 0 | 1 | 2;
  id: 'raizan' | 'matsukaze' | 'hakumine';
  rankId: RankId;
  rankLabel: Bilingual;
  shikona: Bilingual;
  epithet: Bilingual;
  intro: Bilingual;
  styleTag: Bilingual;
  /** Seconds the opponent holds their telegraphed wind-up before striking. */
  tellDuration: number;
  /** Seconds between clashes to breathe and reset footing. */
  recoveryDuration: number;
  /** Probability weights for [oshi, yori, hataki]. */
  moveWeights: Record<MoveId, number>;
  /** Body tint palette so every opponent feels visually distinct. */
  skinDeep: string;
  skinMid: string;
  skinLight: string;
  mawashi: string;
  mawashiAccent: string;
  hasTsuna: boolean;
  scale: number;
};

export const OPPONENTS: OpponentProfile[] = [
  {
    index: 0,
    id: 'raizan',
    rankId: 'maegashira',
    rankLabel: { zh: '西前头三枚目', en: 'West Maegashira #3' },
    shikona: { zh: '雷山', en: 'Raizan' },
    epithet: { zh: '铁掌突张', en: 'Iron Palm Thruster' },
    intro: {
      zh: '起手如雷，专攻正面双掌突张。看准他前扑沉肩的瞬间，以巧卸力。',
      en: 'Charges straight ahead with heavy palm thrusts. Watch his shoulders drop and slip past his momentum.',
    },
    styleTag: { zh: '推挤型 · 押相扑', en: 'Pusher-Thruster · Oshi-zumo' },
    tellDuration: 1.65,
    recoveryDuration: 0.92,
    moveWeights: { oshi: 0.56, yori: 0.26, hataki: 0.18 },
    skinDeep: '#6c493a',
    skinMid: '#946954',
    skinLight: '#ba8e74',
    mawashi: '#3a4a3c',
    mawashiAccent: '#829274',
    hasTsuna: false,
    scale: 0.98,
  },
  {
    index: 1,
    id: 'matsukaze',
    rankId: 'ozeki',
    rankLabel: { zh: '西大关', en: 'West Ozeki' },
    shikona: { zh: '松风', en: 'Matsukaze' },
    epithet: { zh: '磐石上手', en: 'Stone-Rooted Grappler' },
    intro: {
      zh: '沉腰扣带，力如松根入土。别让他顺势贴身抓牢回带，以正面突张破其架势。',
      en: 'Sinks low to lock the mawashi belt and hoist opponents off balance. Keep him out with crisp thrusts.',
    },
    styleTag: { zh: '四组型 · 寄相扑', en: 'Belt Grappler · Yotsu-zumo' },
    tellDuration: 1.32,
    recoveryDuration: 0.8,
    moveWeights: { oshi: 0.24, yori: 0.52, hataki: 0.24 },
    skinDeep: '#5b3a2e',
    skinMid: '#855847',
    skinLight: '#ab7e69',
    mawashi: '#283b4a',
    mawashiAccent: '#9eb1ba',
    hasTsuna: false,
    scale: 1.03,
  },
  {
    index: 2,
    id: 'hakumine',
    rankId: 'yokozuna',
    rankLabel: { zh: '西横纲', en: 'West Yokozuna' },
    shikona: { zh: '白峰', en: 'Hakumine' },
    epithet: { zh: '心技体合一', en: 'Grand Champion of the Peak' },
    intro: {
      zh: '腰系白纲，攻守无定式。推、寄、避三法皆精，唯有读息于瞬息之间方能撼山。',
      en: 'Wears the white sacred tsuna. Masters thrust, belt throw, and sidestep alike — read his breath in the instant.',
    },
    styleTag: { zh: '全能横纲 · 心技体', en: 'All-Round Grand Champion' },
    tellDuration: 1.08,
    recoveryDuration: 0.72,
    moveWeights: { oshi: 0.34, yori: 0.34, hataki: 0.32 },
    skinDeep: '#4e3128',
    skinMid: '#784e3f',
    skinLight: '#a37563',
    mawashi: '#2b2421',
    mawashiAccent: '#c8a65a',
    hasTsuna: true,
    scale: 1.08,
  },
];

export type MoveMeta = {
  id: MoveId;
  keyHint: string;
  name: Bilingual;
  kanji: string;
  reading: string;
  beats: MoveId;
  shortDesc: Bilingual;
  tellCue: Bilingual;
};

export const MOVES: Record<MoveId, MoveMeta> = {
  oshi: {
    id: 'oshi',
    keyHint: 'A / 1',
    name: { zh: '推 · 押出', en: 'Thrust · Oshi' },
    kanji: '推',
    reading: 'OSHI',
    beats: 'yori',
    shortDesc: { zh: '双掌突张 · 克「寄」', en: 'Palm thrust · Beats Grip' },
    tellCue: { zh: '对手沉肩蓄掌，即将猛推！', en: 'Opponent lowers shoulders to thrust!' },
  },
  yori: {
    id: 'yori',
    keyHint: 'S / 2',
    name: { zh: '寄 · 上手投', en: 'Grip-Throw · Yori' },
    kanji: '寄',
    reading: 'YORI',
    beats: 'hataki',
    shortDesc: { zh: '扣带借力 · 克「避」', en: 'Belt grip & throw · Beats Sidestep' },
    tellCue: { zh: '对手沉腰探手，欲扣回带！', en: 'Opponent reaches low for your belt!' },
  },
  hataki: {
    id: 'hataki',
    keyHint: 'D / 3',
    name: { zh: '避 · 叩込', en: 'Sidestep · Hataki' },
    kanji: '避',
    reading: 'HATAKI',
    beats: 'oshi',
    shortDesc: { zh: '撤步拍肩 · 克「推」', en: 'Sidestep slap-down · Beats Thrust' },
    tellCue: { zh: '对手微撤重心，准备借势拍落！', en: 'Opponent shifts light, baiting a charge!' },
  },
};

export const MOVE_ORDER: MoveId[] = ['oshi', 'yori', 'hataki'];

export type KimariteMeta = {
  id: KimariteId;
  name: Bilingual;
  kanji: string;
  reading: string;
  category: Bilingual;
  artFile: string;
  calligraphyLine: Bilingual;
  explanation: Bilingual;
};

export const KIMARITE_BOOK: Record<KimariteId, KimariteMeta> = {
  oshidashi: {
    id: 'oshidashi',
    name: { zh: '押出', en: 'Oshidashi' },
    kanji: '押出',
    reading: 'OSHIDASHI',
    category: { zh: '基本技 · 推挤', en: 'Basic · Frontal Push-Out' },
    artFile: 'experiences/sumo/art/kimarite-oshidashi.png',
    calligraphyLine: {
      zh: '力从地起，双掌叠浪，直送俵外。',
      en: 'Force rises from the clay; twin palms drive the centre past the bale.',
    },
    explanation: {
      zh: '不抓回带，以连续双掌突张推击对手胸肩，凭前冲动能将其重心一步步推出稻草俵外。',
      en: 'Without gripping the belt, sustained palm thrusts to the chest and shoulders drive the opponent out over the straw bale.',
    },
  },
  yorikiri: {
    id: 'yorikiri',
    name: { zh: '寄切', en: 'Yorikiri' },
    kanji: '寄切',
    reading: 'YORIKIRI',
    category: { zh: '基本技 · 扣带', en: 'Basic · Frontal Force-Out' },
    artFile: 'experiences/sumo/art/kimarite-yorikiri.png',
    calligraphyLine: {
      zh: '胸贴回带，合二为一，寸步逼退。',
      en: 'Chest locked to belt; two centres merged and marched past the straw.',
    },
    explanation: {
      zh: '双手紧扣对手回带（Mawashi），胸口贴实合拢重心，不留借力空隙，稳步将对手逼出土俵。',
      en: 'Locking onto the mawashi belt chest-to-chest, the wrestler merges both centres of gravity and walks the opponent out of the ring.',
    },
  },
  uwatenage: {
    id: 'uwatenage',
    name: { zh: '上手投', en: 'Uwatenage' },
    kanji: '上手投',
    reading: 'UWATENAGE',
    category: { zh: '投技 · 借力弧抛', en: 'Throwing · Overarm Belt Throw' },
    artFile: 'experiences/sumo/art/kimarite-uwatenage.png',
    calligraphyLine: {
      zh: '以身为轴，旋腰提带，借山抛岳。',
      en: 'Turn the hips into an axle; lift the belt and arc their whole weight to clay.',
    },
    explanation: {
      zh: '从外侧扣住对手回带，沉髋转身化身为轴，拉带顺势划出大弧将对手抛落土俵。',
      en: 'Seizing the outside belt, sinking the hips and pivoting into an axle to launch the opponent through a sweeping arc onto the clay.',
    },
  },
  hatakikomi: {
    id: 'hatakikomi',
    name: { zh: '叩込', en: 'Hatakikomi' },
    kanji: '叩込',
    reading: 'HATAKIKOMI',
    category: { zh: '巧技 · 以柔克刚', en: 'Twist-Down · Slap-Down' },
    artFile: 'experiences/sumo/art/kimarite-hatakikomi.png',
    calligraphyLine: {
      zh: '退半步，轻拍肩，以彼之冲破彼之衡。',
      en: 'Yield half a step, tap the shoulder — their own charge brings them down.',
    },
    explanation: {
      zh: '趁对手猛冲前倾之际微撤半步，顺势轻拍其肩背借力下压，令其因惯性扑倒触土。',
      en: 'Stepping back half a pace as the opponent lunges, pressing down on the shoulder so their own momentum sends them face-first to the clay.',
    },
  },
};

export type RankMeta = {
  id: RankId;
  name: Bilingual;
  romaji: string;
  badge: Bilingual;
  description: Bilingual;
};

export const RANK_LADDER: RankMeta[] = [
  {
    id: 'yokozuna',
    name: { zh: '横纲', en: 'Yokozuna' },
    romaji: 'YOKOZUNA',
    badge: { zh: '最高位 · 永不降级', en: 'Grand Champion · Never Demoted' },
    description: {
      zh: '相扑至高神格。白麻注连绳与纸垂不仅代表连胜之力，更代表不动如山的品格与心技体。',
      en: 'The summit of sumo. The white hemp tsuna and paper shide signify not only dominance, but unshakeable dignity.',
    },
  },
  {
    id: 'ozeki',
    name: { zh: '大关', en: 'Ozeki' },
    romaji: 'OZEKI',
    badge: { zh: '次高位 · 土俵砥柱', en: 'Champion · Pillar of the Ring' },
    description: {
      zh: '需连续三场所稳定胜绩方得晋升，是本场所的中流砥柱。',
      en: 'Earned through three consecutive strong tournaments; the enduring pillar of the grand basho.',
    },
  },
  {
    id: 'sanyaku',
    name: { zh: '三役', en: 'Sanyaku' },
    romaji: 'SANYAKU',
    badge: { zh: '关胁 · 小结', en: 'Sekiwake · Komusubi' },
    description: {
      zh: '大关之下的顶尖精锐，每场所直面横纲与大关的试炼。',
      en: 'The elite ranks below Ozeki who face Grand Champions every single tournament.',
    },
  },
  {
    id: 'maegashira',
    name: { zh: '前头', en: 'Maegashira' },
    romaji: 'MAEGASHIRA',
    badge: { zh: '幕内主力', en: 'Top Division Contender' },
    description: {
      zh: '幕内最高级别联赛主力，可梳大银杏发髻、系丝绸回带登台。',
      en: 'The heart of the top division, granted the ginkgo-leaf oicho topknot and silk mawashi.',
    },
  },
  {
    id: 'makushita',
    name: { zh: '幕下', en: 'Makushita' },
    romaji: 'MAKUSHITA',
    badge: { zh: '部屋修行', en: 'Apprentice of the Stable' },
    description: {
      zh: '清晨四股百踏、同食相扑锅，一切功夫皆从沉心扎根开始。',
      en: 'Morning shiko by the hundred and shared chanko stew — every champion begins rooted here.',
    },
  },
];

export type CodexItem = {
  id: string;
  tag: Bilingual;
  title: Bilingual;
  body: Bilingual;
};

export const DOHYO_CODEX: CodexItem[] = [
  {
    id: 'tawara',
    tag: { zh: '边界 · 4.55m', en: 'Boundary · 4.55m' },
    title: { zh: '俵（Tawara）', en: 'Straw Bales (Tawara)' },
    body: {
      zh: '稻草捆成的圆环界定神域。脚掌越出稻草俵，或脚底以外任一部位触土，胜负即刻分晓。',
      en: 'Woven rice-straw bales mark the sacred circle. Step outside or touch clay with anything other than the soles, and the bout is decided.',
    },
  },
  {
    id: 'tsuriyane',
    tag: { zh: '神明造', en: 'Shinto Roof' },
    title: { zh: '吊屋根与四房', en: 'Tsuriyane & Four Tassels' },
    body: {
      zh: '悬顶仿神社神明造，四角垂青、朱、白、玄四色流苏（四房），象征四季与青龙、朱雀、白虎、玄武。',
      en: 'A shrine-style roof suspended overhead with four corner tassels (azure, vermilion, white, black) representing the seasons and four cardinal guardians.',
    },
  },
  {
    id: 'rituals',
    tag: { zh: '礼先于力', en: 'Ritual Before Force' },
    title: { zh: '尘手水 · 撒盐 · 四股', en: 'Chirichōzu · Salt · Shiko' },
    body: {
      zh: '拍手翻掌示手中无刃，撒清盐净场祈无伤，高举重踏四股将邪气踩回地底、锻出磐石下盘。',
      en: 'Clap and turn open palms to show no weapon; scatter salt to purify and pray for safety; stomp shiko to drive ill spirits down and root the hips.',
    },
  },
  {
    id: 'shizumono',
    tag: { zh: '地底祈愿', en: 'Buried Offerings' },
    title: { zh: '镇物（Shizumono）', en: 'Six Buried Offerings' },
    body: {
      zh: '每场本场所重铺荒木田土时，正中地底皆埋入洗米、盐、昆布、干鱿鱼、榧子、栗子六样供物献予地神。',
      en: 'Before each grand tournament, six offerings — washed rice, salt, kelp, dried squid, kaya nut and chestnut — are buried at the centre for the earth deity.',
    },
  },
];

export const TIMING = {
  shikoChargeTime: 1.05,
  shikoMinPower: 0.25,
  tachiaiWaitMin: 1.15,
  tachiaiWaitMax: 2.05,
  tachiaiWindow: 0.72,
  tachiaiPerfect: 0.24,
  clashResolveDuration: 0.78,
  kimariteFreezeDuration: 2.35,
  maxRingEdge: 1.0,
} as const;

export type BoutRecord = {
  opponentIndex: 0 | 1 | 2;
  won: boolean;
  kimarite: KimariteId;
  tachiaiGrade: 'perfect' | 'good' | 'matta' | 'missed';
  clashesWon: number;
  clashesTotal: number;
};

export type BoutRuntime = {
  /** -1 = player forced out left edge, +1 = opponent forced out right edge. */
  ringPos: number;
  /** 0..100 posture integrity. Reaching 0 triggers a throw/slap-down finish. */
  playerBalance: number;
  opponentBalance: number;
  /** Bonus spirit earned from Shiko + Tachiai, boosts push power on early clashes. */
  spirit: number;
  /** Current clash sub-phase. */
  phase: 'neutral' | 'telegraph' | 'resolve';
  phaseTimer: number;
  phaseDuration: number;
  /** Opponent's telegraphed intended move. */
  opponentMove: MoveId | null;
  /** Player's chosen response in this clash. */
  playerMove: MoveId | null;
  /** Outcome of the most recent clash. */
  lastOutcome: ClashOutcome;
  /** Which move won the last clash (drives 3D animation). */
  lastWinningMove: MoveId | null;
  streak: number;
  clashesWon: number;
  clashesTotal: number;
  /** Hit-stop freeze timer (seconds) for dramatic impact feel. */
  hitStop: number;
  /** Last clash delta for visual feedback. */
  lastPushDelta: number;
  /** Deterministic PRNG state for opponent move selection. */
  rngState: number;
};

export type SumoGameState = {
  mode: StageMode;
  opponentIndex: 0 | 1 | 2;
  ritualsDone: boolean;
  /** Salt ritual state. */
  salt: { clapped: boolean; throws: number };
  /** Shiko ritual state. */
  shiko: { stomps: number; bestPower: number; foot: 'left' | 'right' };
  /** Tachiai standoff state. */
  tachiai: {
    phase: 'waiting' | 'hakkeyoi' | 'matta' | 'launched';
    timer: number;
    waitDuration: number;
    grade: 'perfect' | 'good' | 'matta' | 'missed' | null;
    mattaCount: number;
  };
  bout: BoutRuntime;
  /** Active finish during kimarite_freeze / bout_result. */
  finish: {
    winner: 'player' | 'opponent';
    kimarite: KimariteId;
    timer: number;
  } | null;
  history: BoutRecord[];
  /** Monotonic event pulse for audio & particle triggers. */
  eventSeq: number;
  lastEvent:
    | 'none'
    | 'clap'
    | 'salt'
    | 'shiko_light'
    | 'shiko_heavy'
    | 'hakkeyoi'
    | 'matta'
    | 'tachiai_win'
    | 'tachiai_miss'
    | 'clash_win'
    | 'clash_lose'
    | 'clash_even'
    | 'kimarite_win'
    | 'kimarite_lose';
  lastEventStrength: number;
};

export function nextRand(state: number): [number, number] {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 0xffffffff, next];
}

export function createBoutRuntime(seed = 0x51a7c3, spirit = 0): BoutRuntime {
  return {
    ringPos: 0,
    playerBalance: 100,
    opponentBalance: 100,
    spirit: Math.max(0, Math.min(1, spirit)),
    phase: 'neutral',
    phaseTimer: 0,
    phaseDuration: 0.55,
    opponentMove: null,
    playerMove: null,
    lastOutcome: 'none',
    lastWinningMove: null,
    streak: 0,
    clashesWon: 0,
    clashesTotal: 0,
    hitStop: 0,
    lastPushDelta: 0,
    rngState: seed >>> 0,
  };
}

export function createInitialState(): SumoGameState {
  return {
    mode: 'title',
    opponentIndex: 0,
    ritualsDone: false,
    salt: { clapped: false, throws: 0 },
    shiko: { stomps: 0, bestPower: 0, foot: 'left' },
    tachiai: {
      phase: 'waiting',
      timer: 0,
      waitDuration: 1.5,
      grade: null,
      mattaCount: 0,
    },
    bout: createBoutRuntime(0x51a7c3, 0),
    finish: null,
    history: [],
    eventSeq: 0,
    lastEvent: 'none',
    lastEventStrength: 0,
  };
}

export function currentOpponent(state: SumoGameState): OpponentProfile {
  return OPPONENTS[state.opponentIndex] ?? OPPONENTS[0];
}

/** Pure triangle evaluation: oshi > yori > hataki > oshi. */
export function evaluateTriangle(player: MoveId, opponent: MoveId): 'win' | 'lose' | 'even' {
  if (player === opponent) return 'even';
  return MOVES[player].beats === opponent ? 'win' : 'lose';
}

export function counterFor(opponentMove: MoveId): MoveId {
  if (opponentMove === 'oshi') return 'hataki';
  if (opponentMove === 'yori') return 'oshi';
  return 'yori';
}

function pickOpponentMove(profile: OpponentProfile, rngState: number, prev: MoveId | null): [MoveId, number] {
  const [u1, s1] = nextRand(rngState);
  const [u2, s2] = nextRand(s1);
  const w = profile.moveWeights;
  const pick = (u: number): MoveId => {
    if (u < w.oshi) return 'oshi';
    if (u < w.oshi + w.yori) return 'yori';
    return 'hataki';
  };
  const first = pick(u1);
  // Avoid repeating the exact same move 3 times in a row unless weighted heavily.
  if (first === prev && u2 < 0.45) {
    return [pick((u1 + 0.37) % 1), s2];
  }
  return [first, s2];
}

function withEvent(
  state: SumoGameState,
  event: SumoGameState['lastEvent'],
  strength = 0.7,
): Pick<SumoGameState, 'eventSeq' | 'lastEvent' | 'lastEventStrength'> {
  return {
    eventSeq: state.eventSeq + 1,
    lastEvent: event,
    lastEventStrength: strength,
  };
}

/** Enter ceremonial prelude (or skip straight to Tachiai if requested). */
export function startTournament(state: SumoGameState, skipRituals = false): SumoGameState {
  if (skipRituals) {
    return enterTachiai({ ...state, opponentIndex: 0, history: [], ritualsDone: true });
  }
  return {
    ...createInitialState(),
    mode: 'ritual_salt',
    ...withEvent(state, 'none', 0),
  };
}

export function performClap(state: SumoGameState): SumoGameState {
  if (state.mode !== 'ritual_salt') return state;
  return {
    ...state,
    salt: { ...state.salt, clapped: true },
    ...withEvent(state, 'clap', 0.8),
  };
}

export function performSaltThrow(state: SumoGameState): SumoGameState {
  if (state.mode !== 'ritual_salt') return state;
  return {
    ...state,
    salt: { clapped: true, throws: state.salt.throws + 1 },
    ...withEvent(state, 'salt', 0.85),
  };
}

export function advanceFromSalt(state: SumoGameState): SumoGameState {
  if (state.mode !== 'ritual_salt') return state;
  return {
    ...state,
    mode: 'ritual_shiko',
  };
}

export function performShikoStomp(state: SumoGameState, power: number): SumoGameState {
  if (state.mode !== 'ritual_shiko') return state;
  const clamped = Math.max(0, Math.min(1, power));
  const heavy = clamped >= TIMING.shikoMinPower;
  const nextStomps = heavy ? state.shiko.stomps + 1 : state.shiko.stomps;
  return {
    ...state,
    shiko: {
      stomps: nextStomps,
      bestPower: Math.max(state.shiko.bestPower, clamped),
      foot: heavy ? (state.shiko.foot === 'left' ? 'right' : 'left') : state.shiko.foot,
    },
    ...withEvent(state, heavy ? 'shiko_heavy' : 'shiko_light', Math.max(0.35, clamped)),
  };
}

export function enterTachiai(state: SumoGameState): SumoGameState {
  const seed = (state.bout.rngState ^ (0x9e3779b9 + state.opponentIndex * 97 + state.eventSeq * 13)) >>> 0;
  const [u, nextSeed] = nextRand(seed);
  const waitDuration = TIMING.tachiaiWaitMin + u * (TIMING.tachiaiWaitMax - TIMING.tachiaiWaitMin);
  const spiritBonus = Math.min(0.6, state.shiko.bestPower * 0.45 + (state.salt.throws > 0 ? 0.15 : 0));
  return {
    ...state,
    mode: 'tachiai',
    ritualsDone: true,
    finish: null,
    tachiai: {
      phase: 'waiting',
      timer: 0,
      waitDuration,
      grade: null,
      mattaCount: 0,
    },
    bout: createBoutRuntime(nextSeed, spiritBonus),
  };
}

/** Player triggers the Tachiai charge (Space / Click). */
export function triggerTachiaiCharge(state: SumoGameState): SumoGameState {
  if (state.mode !== 'tachiai') return state;

  // Pressed before "Hakkeyoi!" -> Matta (false start).
  if (state.tachiai.phase === 'waiting') {
    const [u, nextSeed] = nextRand(state.bout.rngState + 31);
    const waitDuration = TIMING.tachiaiWaitMin + u * (TIMING.tachiaiWaitMax - TIMING.tachiaiWaitMin);
    return {
      ...state,
      tachiai: {
        phase: 'matta',
        timer: 0,
        waitDuration,
        grade: 'matta',
        mattaCount: state.tachiai.mattaCount + 1,
      },
      bout: { ...state.bout, rngState: nextSeed },
      ...withEvent(state, 'matta', 0.7),
    };
  }

  if (state.tachiai.phase !== 'hakkeyoi') return state;

  const reaction = state.tachiai.timer;
  const isPerfect = reaction <= TIMING.tachiaiPerfect;
  const ringGain = isPerfect ? 0.24 : 0.12;
  const oppBalDrop = isPerfect ? 18 : 9;
  const spirit = Math.min(1, state.bout.spirit + (isPerfect ? 0.4 : 0.2));

  return {
    ...state,
    mode: 'bout',
    tachiai: {
      ...state.tachiai,
      phase: 'launched',
      grade: isPerfect ? 'perfect' : 'good',
    },
    bout: {
      ...state.bout,
      ringPos: ringGain,
      opponentBalance: Math.max(15, state.bout.opponentBalance - oppBalDrop),
      spirit,
      phase: 'neutral',
      phaseTimer: 0,
      phaseDuration: 0.65,
      lastOutcome: 'win',
      lastWinningMove: 'oshi',
      lastPushDelta: ringGain,
      hitStop: isPerfect ? 0.12 : 0.06,
    },
    ...withEvent(state, 'tachiai_win', isPerfect ? 1.0 : 0.7),
  };
}

function decideKimarite(winningMove: MoveId, byBalanceBreak: boolean): KimariteId {
  if (byBalanceBreak) {
    if (winningMove === 'hataki') return 'hatakikomi';
    if (winningMove === 'yori') return 'uwatenage';
    return 'oshidashi';
  }
  if (winningMove === 'oshi') return 'oshidashi';
  if (winningMove === 'yori') return 'yorikiri';
  return 'hatakikomi';
}

function finalizeBout(
  state: SumoGameState,
  winner: 'player' | 'opponent',
  winningMove: MoveId,
  byBalanceBreak: boolean,
  nextBout: BoutRuntime,
): SumoGameState {
  const kimarite = decideKimarite(winningMove, byBalanceBreak);
  const record: BoutRecord = {
    opponentIndex: state.opponentIndex,
    won: winner === 'player',
    kimarite,
    tachiaiGrade: state.tachiai.grade ?? 'missed',
    clashesWon: nextBout.clashesWon,
    clashesTotal: Math.max(1, nextBout.clashesTotal),
  };
  const nextHistory = [
    ...state.history.filter((entry) => entry.opponentIndex !== state.opponentIndex),
    record,
  ];
  return {
    ...state,
    mode: 'kimarite_freeze',
    bout: { ...nextBout, hitStop: 0.22 },
    finish: { winner, kimarite, timer: 0 },
    history: nextHistory,
    ...withEvent(state, winner === 'player' ? 'kimarite_win' : 'kimarite_lose', 1.0),
  };
}

/** Player chooses a move during a bout clash. */
export function submitPlayerMove(state: SumoGameState, move: MoveId): SumoGameState {
  if (state.mode !== 'bout') return state;
  const bout = state.bout;
  if (bout.phase !== 'telegraph' || !bout.opponentMove) return state;

  const oppMove = bout.opponentMove;
  const outcome = evaluateTriangle(move, oppMove);
  const spiritBoost = 1 + bout.spirit * 0.22;
  // Earlier reads during the telegraph give a crisp timing bonus.
  const remainingFrac = Math.max(0, 1 - bout.phaseTimer / Math.max(0.1, bout.phaseDuration));
  const timingBonus = remainingFrac > 0.35 ? 1.15 : 1.0;

  let ringPos = bout.ringPos;
  let playerBalance = bout.playerBalance;
  let opponentBalance = bout.opponentBalance;
  let streak = bout.streak;
  let clashesWon = bout.clashesWon;
  const clashesTotal = bout.clashesTotal + 1;
  let lastPushDelta = 0;

  if (outcome === 'win') {
    streak += 1;
    clashesWon += 1;
    const streakScale = 1 + Math.min(0.28, (streak - 1) * 0.14);
    if (move === 'oshi') {
      lastPushDelta = 0.36 * spiritBoost * timingBonus * streakScale;
      ringPos += lastPushDelta;
      opponentBalance -= 18 * timingBonus;
    } else if (move === 'yori') {
      lastPushDelta = 0.28 * spiritBoost * timingBonus * streakScale;
      ringPos += lastPushDelta;
      opponentBalance -= 34 * timingBonus;
    } else {
      // Hatakikomi excels at shattering balance!
      lastPushDelta = 0.18 * spiritBoost * timingBonus;
      ringPos += lastPushDelta;
      opponentBalance -= 44 * timingBonus;
    }
    playerBalance = Math.min(100, playerBalance + 8);
  } else if (outcome === 'lose') {
    streak = 0;
    if (oppMove === 'oshi') {
      lastPushDelta = -0.34;
      ringPos += lastPushDelta;
      playerBalance -= 20;
    } else if (oppMove === 'yori') {
      lastPushDelta = -0.26;
      ringPos += lastPushDelta;
      playerBalance -= 32;
    } else {
      lastPushDelta = -0.16;
      ringPos += lastPushDelta;
      playerBalance -= 38;
    }
  } else {
    // Even clash: heavy lock in the centre, minor wear on both, slight spirit edge.
    lastPushDelta = 0.05 * bout.spirit;
    ringPos += lastPushDelta;
    playerBalance -= 8;
    opponentBalance -= 10;
  }

  ringPos = Math.max(-1.12, Math.min(1.12, ringPos));
  playerBalance = Math.max(0, Math.min(100, playerBalance));
  opponentBalance = Math.max(0, Math.min(100, opponentBalance));

  const nextBout: BoutRuntime = {
    ...bout,
    ringPos,
    playerBalance,
    opponentBalance,
    spirit: Math.max(0, bout.spirit - 0.15),
    phase: 'resolve',
    phaseTimer: 0,
    phaseDuration: TIMING.clashResolveDuration,
    playerMove: move,
    lastOutcome: outcome,
    lastWinningMove: outcome === 'win' ? move : outcome === 'lose' ? oppMove : move,
    streak,
    clashesWon,
    clashesTotal,
    hitStop: outcome === 'even' ? 0.05 : 0.11,
    lastPushDelta,
  };

  // Check decisive win/loss conditions!
  if (ringPos >= TIMING.maxRingEdge) {
    return finalizeBout(state, 'player', move, false, nextBout);
  }
  if (opponentBalance <= 0) {
    return finalizeBout(state, 'player', move, true, nextBout);
  }
  if (ringPos <= -TIMING.maxRingEdge) {
    return finalizeBout(state, 'opponent', oppMove, false, nextBout);
  }
  if (playerBalance <= 0) {
    return finalizeBout(state, 'opponent', oppMove, true, nextBout);
  }

  const eventName = outcome === 'win' ? 'clash_win' : outcome === 'lose' ? 'clash_lose' : 'clash_even';
  return {
    ...state,
    bout: nextBout,
    ...withEvent(state, eventName, outcome === 'even' ? 0.55 : 0.9),
  };
}

/** Frame step for timers (Tachiai countdown, telegraph timeout, resolve recovery, freeze-frame). */
export function stepGame(state: SumoGameState, rawDelta: number): SumoGameState {
  const delta = Math.max(0, Math.min(0.05, rawDelta));
  if (delta <= 0) return state;

  if (state.mode === 'tachiai') {
    const t = state.tachiai;
    const nextTimer = t.timer + delta;
    if (t.phase === 'matta') {
      if (nextTimer >= 0.95) {
        return {
          ...state,
          tachiai: { ...t, phase: 'waiting', timer: 0 },
        };
      }
      return { ...state, tachiai: { ...t, timer: nextTimer } };
    }
    if (t.phase === 'waiting') {
      if (nextTimer >= t.waitDuration) {
        return {
          ...state,
          tachiai: { ...t, phase: 'hakkeyoi', timer: 0 },
          ...withEvent(state, 'hakkeyoi', 0.95),
        };
      }
      return { ...state, tachiai: { ...t, timer: nextTimer } };
    }
    if (t.phase === 'hakkeyoi') {
      if (nextTimer >= TIMING.tachiaiWindow) {
        // Missed the Tachiai window -> opponent seizes initial drive!
        return {
          ...state,
          mode: 'bout',
          tachiai: { ...t, phase: 'launched', grade: 'missed' },
          bout: {
            ...state.bout,
            ringPos: -0.22,
            playerBalance: 86,
            phase: 'neutral',
            phaseTimer: 0,
            phaseDuration: 0.6,
            lastOutcome: 'lose',
            lastWinningMove: 'oshi',
            lastPushDelta: -0.22,
            hitStop: 0.08,
          },
          ...withEvent(state, 'tachiai_miss', 0.8),
        };
      }
      return { ...state, tachiai: { ...t, timer: nextTimer } };
    }
    return state;
  }

  if (state.mode === 'bout') {
    const bout = state.bout;
    if (bout.hitStop > 0) {
      return {
        ...state,
        bout: { ...bout, hitStop: Math.max(0, bout.hitStop - delta) },
      };
    }

    const nextTimer = bout.phaseTimer + delta;
    const profile = currentOpponent(state);

    if (bout.phase === 'neutral') {
      if (nextTimer >= bout.phaseDuration) {
        const [oppMove, nextSeed] = pickOpponentMove(profile, bout.rngState, bout.opponentMove);
        return {
          ...state,
          bout: {
            ...bout,
            phase: 'telegraph',
            phaseTimer: 0,
            phaseDuration: profile.tellDuration,
            opponentMove: oppMove,
            playerMove: null,
            rngState: nextSeed,
          },
        };
      }
      return { ...state, bout: { ...bout, phaseTimer: nextTimer } };
    }

    if (bout.phase === 'telegraph') {
      if (nextTimer >= bout.phaseDuration && bout.opponentMove) {
        // Player failed to react in time -> opponent lands uncontested drive.
        const oppMove = bout.opponentMove;
        const deltaPush = oppMove === 'oshi' ? -0.32 : oppMove === 'yori' ? -0.24 : -0.15;
        const balLoss = oppMove === 'hataki' ? 34 : oppMove === 'yori' ? 28 : 20;
        const ringPos = Math.max(-1.12, bout.ringPos + deltaPush);
        const playerBalance = Math.max(0, bout.playerBalance - balLoss);
        const nextBout: BoutRuntime = {
          ...bout,
          ringPos,
          playerBalance,
          phase: 'resolve',
          phaseTimer: 0,
          phaseDuration: TIMING.clashResolveDuration,
          playerMove: null,
          lastOutcome: 'lose',
          lastWinningMove: oppMove,
          streak: 0,
          clashesTotal: bout.clashesTotal + 1,
          hitStop: 0.09,
          lastPushDelta: deltaPush,
        };
        if (ringPos <= -TIMING.maxRingEdge) {
          return finalizeBout(state, 'opponent', oppMove, false, nextBout);
        }
        if (playerBalance <= 0) {
          return finalizeBout(state, 'opponent', oppMove, true, nextBout);
        }
        return {
          ...state,
          bout: nextBout,
          ...withEvent(state, 'clash_lose', 0.85),
        };
      }
      return { ...state, bout: { ...bout, phaseTimer: nextTimer } };
    }

    if (bout.phase === 'resolve') {
      if (nextTimer >= bout.phaseDuration) {
        return {
          ...state,
          bout: {
            ...bout,
            phase: 'neutral',
            phaseTimer: 0,
            phaseDuration: profile.recoveryDuration,
          },
        };
      }
      return { ...state, bout: { ...bout, phaseTimer: nextTimer } };
    }
    return state;
  }

  if (state.mode === 'kimarite_freeze' && state.finish) {
    const nextTimer = state.finish.timer + delta;
    if (nextTimer >= TIMING.kimariteFreezeDuration) {
      return {
        ...state,
        mode: 'bout_result',
        finish: { ...state.finish, timer: TIMING.kimariteFreezeDuration },
      };
    }
    return {
      ...state,
      finish: { ...state.finish, timer: nextTimer },
    };
  }

  return state;
}

export function proceedAfterBout(state: SumoGameState): SumoGameState {
  if (state.mode !== 'bout_result' && state.mode !== 'kimarite_freeze') return state;
  const won = state.finish?.winner === 'player';
  if (won && state.opponentIndex < 2) {
    const nextIdx = (state.opponentIndex + 1) as 0 | 1 | 2;
    return enterTachiai({ ...state, opponentIndex: nextIdx });
  }
  return { ...state, mode: 'banzuke' };
}

export function rematchCurrentOpponent(state: SumoGameState): SumoGameState {
  return enterTachiai(state);
}

export function selectOpponent(state: SumoGameState, index: 0 | 1 | 2): SumoGameState {
  return enterTachiai({ ...state, opponentIndex: index });
}

export function winsCount(state: SumoGameState): number {
  return state.history.filter((entry) => entry.won).length;
}

export function earnedRank(state: SumoGameState): RankMeta {
  const wins = winsCount(state);
  if (wins >= 3) return RANK_LADDER[0]; // Yokozuna
  if (wins === 2) return RANK_LADDER[1]; // Ozeki
  if (wins === 1) return RANK_LADDER[3]; // Maegashira
  return RANK_LADDER[4]; // Makushita
}

export function buildCompletionResult(state: SumoGameState, language: 'zh' | 'en'): ExperienceResult {
  const rank = earnedRank(state);
  const wins = winsCount(state);
  return {
    completed: true,
    score: wins * 100 + Math.round(state.shiko.bestPower * 25),
    summary: `${rank.name[language]} · ${wins}/3`,
  };
}
