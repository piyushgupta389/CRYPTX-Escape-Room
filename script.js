'use strict';

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
const Audio = (() => {
  const ctx = (() => { try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } })();

  function play(type) {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);

    switch (type) {
      case 'click':
        osc.type = 'sine'; osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
        gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.13);
        break;
      case 'clue':
        [420, 560, 700].forEach((f, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = f;
          const t = now + i * 0.08;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o.start(t); o.stop(t + 0.2);
        });
        break;
      case 'wrong':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.32);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = f;
          const t = now + i * 0.15;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          o.start(t); o.stop(t + 0.55);
        });
        break;
      case 'lose':
        osc.type = 'square'; osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
        gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.start(now); osc.stop(now + 0.95);
        break;
    }
  }
  return { play };
})();

// ─── GAME DATA ─────────────────────────────────────────────────────────────────
/*
  Password Logic by difficulty:
  EASY:   Password = "742"
    Clock → hands point to 7 and 4
    Book  → page number 2
    Combine: 742

  MEDIUM: Password = "3916"
    Painting → "third symbol is a triangle — #3"
    Safe     → screen shows "9_1" with key 6 highlighted
    Mirror   → reversed letters spell "1" as hint
    Box      → contains note: "last digit completes the sequence"
    Combine: 3916

  HARD:   Password = "5823"
    Clock   → hand positions encode Caesar shift: minute=8, hour offset=5
    Candle  → wax drips count: 3 drips — the last digit
    Note    → fibonacci hint: 1,1,2,3 → the digit is position 4 = 3, but the note says "count the spirals"
    Drawer  → cipher: ROT-13 of 'O' = 'B' = 2, but note says "the letter between A and C"
    Painting → "birth year minus death year divided by clue 2" = 2
    Mirror  → reflective: "8" reflected is still 8 → middle digit
    Combine logically: 5 8 2 3
*/

const PUZZLES = {
  easy: {
    timeLimit: 120,
    password: '742',
    doorHint: 'Enter a 3-digit code. The clock shows the first two digits (hour and minute). The book shows the last digit (page number).',
    objects: [
      {
        id: 'clock', icon: '🕰', label: 'OLD CLOCK',
        type: 'clock',
        hint: 'The clock hands seem frozen in time... Why would someone stop it here?',
        examineText: 'The clock is stopped. The hour hand points firmly at 7. The minute hand rests at 4. Someone stopped this deliberately.',
        clue: 'CLUE: The clock reads 7 and 4. These two digits may be part of the key.',
        hasClue: true,
        pos: { left: '12%', top: '20%' },
        clockH: 210, clockM: 240 // degrees
      },
      {
        id: 'book', icon: '📖', label: 'OLD TOME',
        type: 'book',
        hint: 'A book left open. Someone was reading this and left in a hurry.',
        examineText: 'The book is open to a page with a handwritten note in the margin: "PAGE 2 IS WHERE IT ENDS." The rest is a strange poem about locks.',
        clue: 'CLUE: The page number 2. This might complete a sequence.',
        hasClue: true,
        pos: { left: '28%', top: '55%' }
      },
      {
        id: 'painting', icon: '🖼', label: 'PAINTING',
        type: 'painting',
        paintText: '🌿',
        hint: 'A painting of a forest at night. Something about it feels staged.',
        examineText: 'A dark forest painting. On closer inspection, you notice three symbols scratched into the frame: ◈ ◉ ◎ — decorative perhaps, or maybe not.',
        clue: null, hasClue: false,
        pos: { left: '45%', top: '12%' }
      },
      {
        id: 'drawer', icon: '🗄', label: 'DRAWER',
        type: 'drawer',
        hint: 'A locked drawer. The wood is scratched around the keyhole.',
        examineText: 'The drawer is locked tight. You find a sticky note on the side: "The combination is on the wall." You look around — the clock and book stare back at you.',
        clue: null, hasClue: false,
        pos: { left: '62%', top: '50%' }
      },
      {
        id: 'mirror', icon: '🪞', label: 'MIRROR',
        type: 'mirror',
        mirrorText: '⌀',
        hint: 'A dusty mirror. Your reflection stares back, but something is written in the dust.',
        examineText: 'The dust on the mirror forms a crude drawing: a clock face with an "X" on it, and the word "COMBINE" scrawled beneath. The X marks the hour and minute hands.',
        clue: 'CLUE: Combine the clock digits and the book\'s page in that order.',
        hasClue: true,
        pos: { left: '75%', top: '18%' }
      },
      {
        id: 'candle', icon: '🕯', label: 'CANDLE',
        type: 'candle',
        hint: 'A single candle burns. It casts eerie shadows.',
        examineText: 'The candle has been burning a long time. The wax has hardened into strange patterns on the holder. You find a message burned into the base: "Light reveals. Dark conceals. The answer hides in threes."',
        clue: null, hasClue: false,
        pos: { left: '35%', top: '25%' }
      },
    ]
  },

  medium: {
    timeLimit: 90,
    password: '3916',
    doorHint: 'Enter a 4-digit code. Find one digit from each: painting, safe, mirror, note.',
    objects: [
      {
        id: 'clock', icon: '🕰', label: 'CLOCK',
        type: 'clock',
        hint: 'The clock is missing its face numbers. Strange markings replace them.',
        examineText: 'Instead of 1–12, the clock has symbols. But three positions are circled: the 3rd, the 9th, and... one more. The hour hand points at the 3rd position.',
        clue: null, hasClue: false,
        pos: { left: '10%', top: '18%' },
        clockH: 90, clockM: 270
      },
      {
        id: 'painting', icon: '🖼', label: 'PAINTING',
        type: 'painting',
        paintText: '△',
        hint: 'An abstract painting. Three geometric shapes and a number scheme.',
        examineText: 'Three shapes on the canvas: △ □ ◯. Below them: "The third is the key." △ is the third shape listed alphabetically... or is it the third in sequence?',
        clue: 'CLUE: The third shape is △ — triangle = 3. First digit: 3.',
        hasClue: true,
        pos: { left: '42%', top: '10%' }
      },
      {
        id: 'safe', icon: '🔐', label: 'WALL SAFE',
        type: 'safe',
        hint: 'A recessed wall safe. Its digital screen flickers weakly.',
        examineText: 'The safe screen shows: "9_1" — two of three digits visible. One key on the keypad glows brighter than the rest: the "6". "Middle digit completes the pattern," reads a tag attached to the handle.',
        clue: 'CLUE: Safe screen shows 9_1. The glowing key is 6. Pattern: 9 [6] 1 → digits 2,3,4 = 916.',
        hasClue: true,
        pos: { left: '60%', top: '22%' }
      },
      {
        id: 'mirror', icon: '🪞', label: 'MIRROR',
        type: 'mirror',
        mirrorText: 'Ↄ',
        hint: 'A mirror with something written backward on it.',
        examineText: 'The message on the mirror reads (in reverse): "ORDER IS: SHAPE, SAFE THREE, SAFE ONE." This tells you the digit sequence, not the digits themselves.',
        clue: 'CLUE: The order confirmed — painting, then safe digits (9, 6, 1). Full code: 3916.',
        hasClue: true,
        pos: { left: '20%', top: '55%' }
      },
      {
        id: 'drawer', icon: '🗄', label: 'DRAWER',
        type: 'drawer',
        hint: 'A partly open drawer. A paper sticks out slightly.',
        examineText: 'Inside the drawer: a torn page. "The safe holds three, the painting holds one. But only when combined in the right order do they speak." A red stamp reads: CLASSIFIED.',
        clue: null, hasClue: false,
        pos: { left: '70%', top: '52%' }
      },
      {
        id: 'note', icon: '📋', label: 'NOTE',
        type: 'note',
        hint: 'A crumpled note on the floor. Handwritten in a hurry.',
        examineText: 'The note says: "I remembered the code by thinking: TREE → 3, DIAL → 9-6-1. If you\'re reading this — you\'re on the right track. The shapes don\'t lie."',
        clue: 'CLUE: TREE = 3 (3 letters? No — triangle = 3). DIAL = 961. Code = 3916.',
        hasClue: true,
        pos: { left: '48%', top: '58%' }
      },
    ]
  },

  hard: {
    timeLimit: 60,
    password: '5823',
    doorHint: 'Enter a 4-digit code. Deduce it from the objects - no direct hints.',
    objects: [
      {
        id: 'clock', icon: '🕰', label: 'CLOCK',
        type: 'clock',
        hint: 'Something about the clock position is encoded, not decorative.',
        examineText: 'Hour hand: position 5. Minute hand: position 8 (on the clock face, pointing at the 8). But is this a time, or a cipher? The label on the clock\'s back reads: "H then M."',
        clue: 'CLUE: H=5, M=8. First two digits: 5, 8.',
        hasClue: true,
        pos: { left: '10%', top: '20%' },
        clockH: 150, clockM: 288
      },
      {
        id: 'painting', icon: '🖼', label: 'PAINTING',
        type: 'painting',
        paintText: '∑',
        hint: 'A mathematical painting. The artist was no ordinary person.',
        examineText: 'A sigma symbol dominates the canvas. Below it: "Sum of digits on the safe that glow minus 4." The safe has digits 3 and... you\'ll need to check.',
        clue: null, hasClue: false,
        pos: { left: '38%', top: '12%' }
      },
      {
        id: 'safe', icon: '🔐', label: 'WALL SAFE',
        type: 'safe',
        hint: 'The safe keypad has certain keys that are worn down more than others.',
        examineText: 'Keys 3, 6, and 7 are worn. But the painting said "sum of glowing digits minus 4." 3 + 6 + 7 = 16. But which ones truly "glow"? Only 3 and... the answer changes depending on what you choose.',
        clue: null, hasClue: false,
        pos: { left: '58%', top: '20%' }
      },
      {
        id: 'mirror', icon: '🪞', label: 'MIRROR',
        type: 'mirror',
        mirrorText: '8',
        hint: 'The mirror shows a digit. But something about it is recursive.',
        examineText: 'The mirror has the digit 8 etched into its surface. "What digit looks the same reflected?" — the inscription beneath asks. 8. This is also the second digit from the clock.',
        clue: 'CLUE: 8 is confirmed as the second digit. Cross-reference clock: 5,8,?,?.',
        hasClue: true,
        pos: { left: '72%', top: '18%' }
      },
      {
        id: 'drawer', icon: '🗄', label: 'DRAWER',
        type: 'drawer',
        hint: 'The drawer has a letter carved into its underside.',
        examineText: 'Underneath the drawer, carved: "B". The alphabet: A=1, B=2, C=3... B is 2. A cipher note inside says "The third digit is the letter between A and C." A=1, C=3 — between them is B=2.',
        clue: 'CLUE: B = 2. Third digit is 2. Running sequence: 5, 8, 2, ?.',
        hasClue: true,
        pos: { left: '22%', top: '52%' }
      },
      {
        id: 'candle', icon: '🕯', label: 'CANDLE',
        type: 'candle',
        hint: 'The candle wax has hardened into a specific pattern. Count carefully.',
        examineText: 'Three distinct wax drip formations on the holder. Count: one cluster, two clusters, three clusters. But wait — the base has a carved spiral. "Count the turns of the spiral." One full spiral = 3 turns. The digit is 3.',
        clue: 'CLUE: Three wax formations, three spiral turns. Final digit: 3. Code = 5823.',
        hasClue: true,
        pos: { left: '48%', top: '55%' }
      },
    ]
  }
};

// ─── GAME STATE ────────────────────────────────────────────────────────────────
let state = {
  difficulty: null,
  timeLeft: 0,
  timerInterval: null,
  cluesFound: new Set(),
  totalClues: 0,
  startTime: null,
  currentObject: null,
  examinedObjects: new Set(),
};

// ─── DOM REFS ──────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const screens = {
  start: $('screen-start'),
  game:  $('screen-game'),
  win:   $('screen-win'),
  lose:  $('screen-lose'),
};

// ─── SCREEN SWITCHER ──────────────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ─── START GAME ───────────────────────────────────────────────────────────────
function startGame(difficulty) {
  Audio.play('click');
  state.difficulty = difficulty;
  const puzzle = PUZZLES[difficulty];

  // Generate random password for EASY
  if (difficulty === 'easy') {
    const hour = Math.floor(Math.random() * 9) + 1; // 1-9
    const minute = Math.floor(Math.random() * 9) + 1; // 1-9
    const page = Math.floor(Math.random() * 9) + 1; // 1-9
    puzzle.password = `${hour}${minute}${page}`;

    // Update clock object
    const clockObj = puzzle.objects.find(o => o.id === 'clock');
    clockObj.clockH = hour * 30;
    clockObj.clockM = minute * 30;
    clockObj.examineText = `The clock is stopped. The hour hand points firmly at ${hour}. The minute hand rests at ${minute}. Someone stopped this deliberately.`;
    clockObj.clue = `CLUE: The clock reads ${hour} and ${minute}. These two digits may be part of the key.`;

    // Update book object
    const bookObj = puzzle.objects.find(o => o.id === 'book');
    bookObj.examineText = `The book is open to a page with a handwritten note in the margin: "PAGE ${page} IS WHERE IT ENDS." The rest is a strange poem about locks.`;
    bookObj.clue = `CLUE: The page number ${page}. This might complete a sequence.`;

    // Update mirror object
    const mirrorObj = puzzle.objects.find(o => o.id === 'mirror');
    mirrorObj.clue = `CLUE: Combine the clock digits and the book's page in that order.`;
  }

  state.timeLeft = puzzle.timeLimit;
  state.cluesFound = new Set();
  state.examinedObjects = new Set();
  state.currentObject = null;
  state.totalClues = puzzle.objects.filter(o => o.hasClue).length;
  state.startTime = Date.now();

  $('hud-diff-badge').textContent = difficulty.toUpperCase();
  updateClueCounter();
  updateTimer();

  buildRoom(puzzle.objects);
  showScreen('game');

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimer, 1000);
}

// ─── BUILD ROOM ────────────────────────────────────────────────────────────────
function buildRoom(objects) {
  const layer = $('objects-layer');
  layer.innerHTML = '';
  objects.forEach(obj => {
    const el = document.createElement('div');
    el.className = `room-object obj-${obj.type}`;
    el.id = `obj-${obj.id}`;
    el.style.left   = obj.pos.left;
    el.style.top    = obj.pos.top;
    el.style.position = 'absolute';
    el.innerHTML = buildObjectHTML(obj);
    el.addEventListener('click', () => openObjectModal(obj));
    el.addEventListener('touchend', e => { e.preventDefault(); openObjectModal(obj); }, { passive: false });
    layer.appendChild(el);
  });
}

function buildObjectHTML(obj) {
  switch (obj.type) {
    case 'clock': return buildClock(obj);
    case 'painting': return buildPainting(obj);
    case 'drawer': return buildDrawer();
    case 'book': return buildBook();
    case 'mirror': return buildMirror(obj);
    case 'box': return buildBox();
    case 'candle': return buildCandle();
    case 'safe': return buildSafe();
    case 'note': return buildNote();
    default: return `<div class="obj-inner"><span style="font-size:2rem">${obj.icon}</span></div>`;
  }
}

function buildClock(obj) {
  const hr = obj.clockH || 150;
  const mn = obj.clockM || 270;
  return `<div class="obj-inner">
    <div class="clock-face">
      <div class="clock-hand hand-h" style="transform:rotate(${hr}deg)"></div>
      <div class="clock-hand hand-m" style="transform:rotate(${mn}deg)"></div>
      <div class="clock-center"></div>
    </div>
  </div>`;
}
function buildPainting(obj) {
  return `<div class="obj-inner">
    <div class="painting-canvas">
      <span style="font-size:2rem">${obj.paintText || '🌿'}</span>
      <span class="painting-label">NO. ${Math.floor(Math.random()*99)+1}</span>
    </div>
  </div>`;
}
function buildDrawer() {
  return `<div class="obj-inner">
    <div class="drawer-slot"><div class="drawer-knob"></div></div>
    <div class="drawer-slot"><div class="drawer-knob"></div></div>
  </div>`;
}
function buildBook() {
  return `<div class="obj-inner">
    <span class="book-title">CODEX</span>
    ${Array(6).fill('<div class="book-line"></div>').join('')}
  </div>`;
}
function buildMirror(obj) {
  return `<div class="obj-inner">
    <div class="mirror-sheen"></div>
    <span class="mirror-text">${obj.mirrorText || '?'}</span>
  </div>`;
}
function buildBox() {
  return `<div class="obj-inner">
    <div class="box-lid"><div class="box-lock"></div></div>
    <div class="box-body"><span class="box-icon">📦</span></div>
  </div>`;
}
function buildCandle() {
  return `<div class="obj-inner">
    <div class="candle-flame"></div>
    <div class="candle-body"></div>
    <div class="candle-base"></div>
  </div>`;
}
function buildSafe() {
  const keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];
  return `<div class="obj-inner">
    <div class="safe-screen">_ _ _</div>
    <div class="safe-keys">${keys.map(k=>`<div class="safe-key">${k}</div>`).join('')}</div>
  </div>`;
}
function buildNote() {
  return `<div class="obj-inner">
    ${Array(5).fill('<div class="note-line"></div>').join('')}
  </div>`;
}

// ─── OBJECT MODAL ─────────────────────────────────────────────────────────────
function openObjectModal(obj) {
  Audio.play('click');
  state.currentObject = obj;

  $('modal-icon').textContent = obj.icon;
  $('modal-title').textContent = obj.label;
  $('modal-clue-reveal').classList.add('hidden');

  const alreadyExamined = state.examinedObjects.has(obj.id);

  if (alreadyExamined) {
    $('modal-body').textContent = obj.examineText;
    if (obj.hasClue) {
      $('modal-clue-text').textContent = obj.clue;
      $('modal-clue-reveal').classList.remove('hidden');
    }
    $('modal-examine').textContent = 'EXAMINE AGAIN';
  } else {
    $('modal-body').textContent = obj.hint;
    $('modal-examine').textContent = 'EXAMINE CLOSELY';
  }

  $('modal-overlay').classList.remove('hidden');
}

$('modal-examine').addEventListener('click', () => {
  const obj = state.currentObject;
  if (!obj) return;
  Audio.play('click');
  state.examinedObjects.add(obj.id);

  $('modal-body').textContent = obj.examineText;
  $('modal-examine').textContent = 'EXAMINE AGAIN';

  if (obj.hasClue && !state.cluesFound.has(obj.id)) {
    state.cluesFound.add(obj.id);
    Audio.play('clue');
    $('modal-clue-text').textContent = obj.clue;
    $('modal-clue-reveal').classList.remove('hidden');
    updateClueCounter();
    logClue(obj.label, obj.clue);
    // Mark object as found
    const el = document.getElementById(`obj-${obj.id}`);
    if (el) el.classList.add('found');
  } else if (obj.hasClue) {
    $('modal-clue-text').textContent = obj.clue;
    $('modal-clue-reveal').classList.remove('hidden');
  }
});

$('modal-close').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });

function closeModal() {
  $('modal-overlay').classList.add('hidden');
  state.currentObject = null;
}

// ─── DOOR MODAL ───────────────────────────────────────────────────────────────
function openDoorModal() {
  Audio.play('click');
  const puzzle = PUZZLES[state.difficulty];
  $('door-hint-text').textContent = puzzle.doorHint;
  $('password-input').value = '';
  $('door-error').classList.add('hidden');
  $('modal-door-overlay').classList.remove('hidden');
  setTimeout(() => $('password-input').focus(), 100);
}

function checkPassword() {
  const input = $('password-input').value.trim().toUpperCase();
  const correct = PUZZLES[state.difficulty].password.toUpperCase();

  if (input === correct) {
    Audio.play('win');
    $('modal-door-overlay').classList.add('hidden');
    triggerWin();
  } else {
    Audio.play('wrong');
    const box = $('modal-door-box');
    box.classList.add('shake');
    setTimeout(() => box.classList.remove('shake'), 520);
    $('door-error').textContent = `✗ Incorrect code. The room does not yield easily.`;
    $('door-error').classList.remove('hidden');
    $('password-input').value = '';
  }
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function tickTimer() {
  state.timeLeft--;
  updateTimer();
  if (state.timeLeft <= 0) {
    clearInterval(state.timerInterval);
    triggerLose();
  }
  if (state.timeLeft <= 15) $('timer').classList.add('danger');
}

function updateTimer() {
  const m = Math.floor(state.timeLeft / 60);
  const s = state.timeLeft % 60;
  $('timer').textContent = `${m}:${s.toString().padStart(2,'0')}`;
}

// ─── CLUE COUNTER ─────────────────────────────────────────────────────────────
function updateClueCounter() {
  $('clue-counter').textContent = `${state.cluesFound.size}/${state.totalClues}`;
}

function logClue(label, clue) {
  const log = $('clue-log');
  log.innerHTML = `<span class="log-entry-new">▶ [${label}] ${clue.replace('CLUE: ','')}</span>`;
}

// ─── WIN / LOSE ────────────────────────────────────────────────────────────────
function triggerWin() {
  clearInterval(state.timerInterval);
  const elapsed = Math.round((Date.now() - state.startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  $('win-time-msg').textContent = `Escaped in ${m > 0 ? m + 'm ' : ''}${s}s on ${state.difficulty.toUpperCase()} difficulty.`;
  spawnConfetti();
  showScreen('win');
}

function triggerLose() {
  Audio.play('lose');
  const password = PUZZLES[state.difficulty].password;
  $('lose-title').textContent = 'TIME\'S UP';
  $('lose-sub').textContent = `The correct code was: ${password}`;
  showScreen('lose');
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const container = $('confetti-container');
  container.innerHTML = '';
  const colors = ['#00ff88','#00c96b','#ffffff','#ffcc00','#00843c'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (Math.random() * 8 + 4) + 'px';
    piece.style.height = (Math.random() * 8 + 4) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    piece.style.animationDelay = Math.random() * 1.5 + 's';
    container.appendChild(piece);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  // Event listeners
  const modalExamine = $('modal-examine');
  if (modalExamine) {
    modalExamine.addEventListener('click', () => {
      const obj = state.currentObject;
      if (!obj) return;
      Audio.play('click');
      state.examinedObjects.add(obj.id);

      $('modal-body').textContent = obj.examineText;
      $('modal-examine').textContent = 'EXAMINE AGAIN';

      if (obj.hasClue && !state.cluesFound.has(obj.id)) {
        state.cluesFound.add(obj.id);
        Audio.play('clue');
        $('modal-clue-text').textContent = obj.clue;
        $('modal-clue-reveal').classList.remove('hidden');
        updateClueCounter();
        logClue(obj.label, obj.clue);
        // Mark object as found
        const el = document.getElementById(`obj-${obj.id}`);
        if (el) el.classList.add('found');
      } else if (obj.hasClue) {
        $('modal-clue-text').textContent = obj.clue;
        $('modal-clue-reveal').classList.remove('hidden');
      }
    });
  }

  const modalClose = $('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeModal);

  const modalOverlay = $('modal-overlay');
  if (modalOverlay) modalOverlay.addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });

  const openDoorBtn = $('open-door-btn');
  if (openDoorBtn) openDoorBtn.addEventListener('click', openDoorModal);

  const doorObj = $('door-obj');
  if (doorObj) doorObj.addEventListener('click', openDoorModal);

  const doorModalClose = $('door-modal-close');
  if (doorModalClose) doorModalClose.addEventListener('click', () => $('modal-door-overlay').classList.add('hidden'));

  const modalDoorOverlay = $('modal-door-overlay');
  if (modalDoorOverlay) modalDoorOverlay.addEventListener('click', e => {
    if (e.target === $('modal-door-overlay')) $('modal-door-overlay').classList.add('hidden');
  });

  const passwordInput = $('password-input');
  if (passwordInput) passwordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
  });

  const submitPassword = $('submit-password');
  if (submitPassword) submitPassword.addEventListener('click', checkPassword);

  const winRestart = $('win-restart');
  if (winRestart) winRestart.addEventListener('click', () => { Audio.play('click'); showScreen('start'); });

  const loseRestart = $('lose-restart');
  if (loseRestart) loseRestart.addEventListener('click', () => { Audio.play('click'); showScreen('start'); });

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.diff));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('modal-overlay').classList.contains('hidden')) closeModal();
      if (!$('modal-door-overlay').classList.contains('hidden')) $('modal-door-overlay').classList.add('hidden');
    }
  });

  showScreen('start');
});
