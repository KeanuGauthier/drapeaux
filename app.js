import { COUNTRIES } from "./data.js";
import { isCorrect, isExact, isName } from "./match.js";

const LOT_SIZE = 10;
const TOTAL = COUNTRIES.length;
const LOTS = Math.ceil(TOTAL / LOT_SIZE);
const KEY = "drapeaux.v1";

const $app = document.getElementById("app");
const $settings = document.getElementById("settings");
const $interval = document.getElementById("interval-select");

/* ---------- Données ---------- */

const lotIdx = (lot) => {
  const s = (lot - 1) * LOT_SIZE;
  return Array.from({ length: Math.min(LOT_SIZE, TOTAL - s) }, (_, i) => s + i);
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const flagSrc = (i) => `flags/${COUNTRIES[i].file}`;
const preload = (i) => { if (i != null) new Image().src = flagSrc(i); };

/* ---------- État (sauvegardé dans le navigateur) ---------- */

const fresh = (interval = 5) => ({ interval, frontier: 0, passed: 0, queue: [], runFails: [], cur: null });

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s.frontier === "number" && Array.isArray(s.queue)) return { runFails: [], ...s };
  } catch {}
  return fresh();
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

let view = "home"; // home | session | gallery
let lockUntil = 0;

/* ---------- Déroulé des lots ----------
   Une étape = { type: "learn" | "quiz", lot, kind, runTotal? }
   - nouveau lot N : apprentissage N, test N, puis révision du lot N-1
   - tous les `interval` lots : parcours complet des lots 1..N à la place de la révision
   - erreur au lot X : on termine X, on le refait, puis on recule au lot X-1
   - pendant un parcours complet : pas de recul. On va jusqu'au bout, puis on refait dans l'ordre
     chaque lot où il y a eu une erreur (kind "fix"), jusqu'au sans-faute
*/

function nextStep() {
  if (!S.queue.length) {
    if (S.frontier >= LOTS) return null;
    const n = ++S.frontier;
    S.queue.push({ type: "learn", lot: n, kind: "new" }, { type: "quiz", lot: n, kind: "new" });
    if (n > 1) {
      if (S.interval > 0 && n % S.interval === 0) S.queue.push(...runSteps(n));
      else S.queue.push({ type: "quiz", lot: n - 1, kind: "review" });
    }
  }
  return S.queue.shift();
}
const runSteps = (n) => Array.from({ length: n }, (_, i) => ({ type: "quiz", lot: i + 1, kind: "run", runTotal: n }));

function stepInfo(step) {
  const n = step.lot;
  const count = lotIdx(n).length;
  switch (step.kind) {
    case "new":
      return step.type === "learn"
        ? { chip: "Nouveau lot", cls: "new", title: `Lot ${n} : à apprendre`, text: `Voici les ${count} drapeaux du lot ${n}, avec leur nom. Prends le temps de les retenir : on te teste juste après.`, btn: "Découvrir les drapeaux" }
        : { chip: `Test · lot ${n}`, cls: "new", title: `Test du lot ${n}`, text: "Tape le nom de chaque pays : 20 secondes par drapeau, 3 essais. Après une erreur, tu recopies le nom 3 fois. Même en cas d'erreur, tu finis le lot.", btn: "C'est parti" };
    case "review":
      return { chip: `Révision · lot ${n}`, cls: "", title: `On revient au lot ${n}`, text: "Un lot en arrière, pour être sûr que ça reste en mémoire.", btn: "Réviser" };
    case "redo":
      return { chip: `À refaire · lot ${n}`, cls: "back", title: `On refait le lot ${n}`, text: "Au moins une erreur : on recommence ce lot.", btn: "Recommencer" };
    case "fix":
      return { chip: `Rattrapage · lot ${n}`, cls: "back", title: `On refait le lot ${n}`, text: "Fin du parcours : on refait, dans l'ordre, les lots où tu as fait des erreurs.", btn: "Recommencer" };
    case "back":
      return { chip: `Retour · lot ${n}`, cls: "back", title: `Retour au lot ${n}`, text: "Après une erreur, on recule d'un lot avant de repartir.", btn: "Y aller" };
    case "run":
      return {
        chip: `Parcours · ${n}/${step.runTotal}`, cls: "run",
        title: n === 1 ? "Retour à zéro" : `Parcours complet : lot ${n}`,
        text: n === 1 ? `On repart de zéro : lots 1 à ${step.runTotal} d'affilée. Si tu te trompes, on continue jusqu'au bout, puis on refait les lots ratés.` : `On enchaîne avec le lot ${n} sur ${step.runTotal}.`,
        btn: n === 1 ? "Lancer le parcours" : "Continuer",
      };
  }
}

function startStep(step, prev) {
  S.cur = { step, phase: "intro", prev };
  save();
  render();
}

function begin() {
  const c = S.cur;
  const idx = lotIdx(c.step.lot);
  c.phase = c.step.type;
  c.pos = 0;
  c.order = idx;
  c.results = [];
  c.answered = false;
  c.tries = 0;
  c.copy = 0;
  save();
  render(true);
}

function finishLearn() {
  startStep(nextStep(), null);
}

function finishQuiz() {
  const { step, order, results } = S.cur;
  const wrong = order.filter((_, i) => !results[i].ok);
  const summary = { step, total: order.length, correct: order.length - wrong.length, wrong, note: "" };
  if (step.kind === "run") {
    // parcours complet : on ne recule pas, on note le lot et on continue
    if (step.lot === 1) S.runFails = [];
    if (wrong.length) S.runFails.push(step.lot);
    const end = step.lot === step.runTotal;
    if (end && S.runFails.length) {
      S.queue.unshift(...S.runFails.map((lot) => ({ type: "quiz", lot, kind: "fix" })));
      summary.note = `Fin du parcours : on refait ${S.runFails.length > 1 ? "les lots" : "le lot"} ${S.runFails.join(", ")}.`;
      S.runFails = [];
    } else {
      summary.note = wrong.length ? "On continue le parcours, tu referas ce lot à la fin." : "Sans-faute, on avance.";
    }
    if (!wrong.length) S.passed = Math.max(S.passed, step.lot);
  } else if (step.kind === "fix") {
    if (wrong.length) {
      S.queue.unshift({ type: "quiz", lot: step.lot, kind: "fix" });
      summary.note = `On refait encore le lot ${step.lot}.`;
    } else {
      summary.note = "Sans-faute, on avance.";
      S.passed = Math.max(S.passed, step.lot);
    }
  } else if (wrong.length) {
    const extra = [{ type: "quiz", lot: step.lot, kind: "redo" }];
    if (step.lot > 1) extra.push({ type: "quiz", lot: step.lot - 1, kind: "back" });
    // le lot du "retour" est déjà au programme : pas besoin de le refaire deux fois de suite
    const back = extra[extra.length - 1];
    while (S.queue[0] && S.queue[0].type === "quiz" && S.queue[0].lot === back.lot && ["review", "back"].includes(S.queue[0].kind)) S.queue.shift();
    S.queue.unshift(...extra);
    summary.note = step.lot > 1 ? `On refait le lot ${step.lot}, puis on recule au lot ${step.lot - 1}.` : "On refait le lot 1.";
  } else {
    summary.note = "Sans-faute, on avance.";
    S.passed = Math.max(S.passed, step.lot);
  }
  const next = nextStep();
  if (next) startStep(next, summary);
  else { S.cur = { phase: "complete", prev: summary }; save(); render(); }
}

// Une réponse correcte se valide toute seule ; sinon 3 essais (à la validation) et 20 s par drapeau.
const TIME_LIMIT = 20000;
const MAX_TRIES = 3;
const COPY_TIMES = 3; // après une erreur, on recopie le nom du pays
let deadline = 0;
let timerId = null;

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function startTimer() {
  stopTimer();
  deadline = Date.now() + TIME_LIMIT;
  tick();
  timerId = setInterval(tick, 100);
}

function tick() {
  const c = S.cur;
  if (view !== "session" || !c || c.phase !== "quiz" || c.answered) return stopTimer();
  const left = deadline - Date.now();
  if (left <= 0) {
    const input = document.getElementById("answer");
    return finalize({ ok: false, given: input ? input.value.trim() : "", timeout: true });
  }
  const bar = document.getElementById("tbar");
  if (!bar) return;
  bar.style.transform = `scaleX(${left / TIME_LIMIT})`;
  bar.parentElement.classList.toggle("low", left < 5000);
  document.getElementById("tsec").textContent = Math.ceil(left / 1000);
}

function finalize(result) {
  const c = S.cur;
  stopTimer();
  c.results[c.pos] = result;
  c.answered = true;
  lockUntil = Date.now() + 250;
  save();
  showFeedback();
}

function showTries(given) {
  const left = MAX_TRIES - S.cur.tries;
  const fb = document.getElementById("feedback");
  fb.className = "feedback warn";
  fb.innerHTML = `<strong>Pas tout à fait${given ? ` : « ${esc(given)} »` : ""}</strong><span class="small">Il te reste ${left} essai${left > 1 ? "s" : ""}.</span>`;
  fb.hidden = false;
}

function submitAnswer(given) {
  const c = S.cur;
  given = given.trim();
  if (!given) return;
  if (isCorrect(given, c.order[c.pos])) return finalize({ ok: true, given });
  c.tries = (c.tries || 0) + 1;
  if (c.tries >= MAX_TRIES) return finalize({ ok: false, given });
  save();
  showTries(given);
  const input = document.getElementById("answer");
  input.value = "";
  input.focus({ preventScroll: true });
}

const needsCopy = (c) => c.phase === "quiz" && c.answered && !c.results[c.pos].ok && (c.copy || 0) < COPY_TIMES;

function copyAttempt(given) {
  const c = S.cur;
  given = given.trim();
  if (!given) return;
  if (isName(given, c.order[c.pos])) {
    c.copy = (c.copy || 0) + 1;
    lockUntil = Date.now() + 250;
    save();
    return showCopy();
  }
  const fb = document.getElementById("copy-msg");
  fb.textContent = "Ce n'est pas le bon nom : recopie-le exactement.";
  const input = document.getElementById("answer");
  input.select();
}

function next() {
  const c = S.cur;
  if (Date.now() < lockUntil) return;
  if (needsCopy(c)) return;
  if (c.phase === "learn") {
    if (c.pos + 1 >= c.order.length) return finishLearn();
    c.pos++;
  } else {
    c.pos++;
    c.answered = false;
    c.tries = 0;
    c.copy = 0;
    if (c.pos >= c.order.length) return finishQuiz();
  }
  save();
  render(true);
}

/* ---------- Rendu ---------- */

function render(focus = false) {
  stopTimer();
  window.scrollTo(0, 0);
  if (view === "gallery") return renderGallery();
  if (view === "session" && S.cur) {
    const p = S.cur.phase;
    if (p === "intro") return renderIntro();
    if (p === "learn") return renderLearn();
    if (p === "quiz") return renderQuestion(focus);
    if (p === "complete") return renderComplete();
  }
  view = "home";
  renderHome();
}

function renderHome() {
  const started = S.frontier > 0 || S.cur;
  const info = S.cur && S.cur.step ? stepInfo(S.cur.step) : null;
  const upcoming = info ? info.title : S.frontier >= LOTS && !S.queue.length ? "Tout est terminé" : `Lot ${S.frontier + 1} : à apprendre`;
  const lots = Array.from({ length: LOTS }, (_, i) => {
    const n = i + 1;
    const cls = n <= S.passed ? "done" : n === S.frontier ? "cur" : "";
    return `<div class="lot ${cls}" title="Lot ${n}">${n}</div>`;
  }).join("");
  $app.innerHTML = `
    <div class="hero">
      <span class="chip" style="align-self:flex-start">${TOTAL} drapeaux · ${LOTS} lots</span>
      <h1>Drapeaux du monde</h1>
      <p class="muted">Apprends-les dans l'ordre du quiz, dix par dix, jusqu'au sans-faute.</p>
    </div>
    <div class="card stack">
      <div class="lots" aria-label="Progression des lots">${lots}</div>
      <p class="small muted">Lots validés : <strong>${S.passed}</strong> / ${LOTS}${started ? ` · Prochaine étape : ${esc(upcoming)}` : ""}</p>
      <button class="btn primary" data-act="continue">${started ? "Continuer" : "Commencer"}</button>
    </div>
    <div class="row">
      <button class="btn" data-act="gallery">Tous les drapeaux</button>
      <button class="btn" data-act="settings">Réglages</button>
    </div>
    <details>
      <summary>Comment ça marche ?</summary>
      <ol>
        <li>Chaque nouveau lot de 10 drapeaux t'est présenté avec le nom des pays, puis tu es testé.</li>
        <li>Ensuite on revient un lot en arrière pour réviser.</li>
        <li>À chaque erreur, tu termines le lot, tu le refais, puis tu recules au lot précédent.</li>
        <li>Tous les ${S.interval || "—"} lots, on repart de zéro : lots 1 à N d'affilée, sans recul. Les lots où tu t'es trompé sont refaits à la fin, dans l'ordre.</li>
        <li>Dès que tu tapes le bon nom, ça valide tout seul. Tu as 20 secondes par drapeau et 3 essais si tu valides un mauvais nom.</li>
        <li>Après chaque erreur, tu recopies le nom du pays 3 fois avant de passer au suivant.</li>
        <li>Les accents, les majuscules et les abréviations (USA, RDC…) sont acceptés, ainsi que les petites fautes de frappe, mais pas les grosses.</li>
      </ol>
    </details>`;
}

function topbar(info) {
  return `<header class="topbar">
    <button class="btn ghost small" data-act="home">← Accueil</button>
    <span class="chip ${info.cls}">${esc(info.chip)}</span>
  </header>`;
}

function resultBlock(prev) {
  const perfect = prev.correct === prev.total;
  const info = stepInfo(prev.step);
  const wrong = prev.wrong.map((i) => `
    <div class="mistake"><img src="${flagSrc(i)}" alt=""><span>${esc(COUNTRIES[i].name)}</span></div>`).join("");
  return `<section class="card result">
    <div class="score ${perfect ? "ok" : "ko"}">${prev.correct}/${prev.total}</div>
    <p><strong>${esc(info.title)}</strong> · ${perfect ? "Parfait !" : "À revoir."} ${esc(prev.note || "")}</p>
    ${wrong ? `<h3 class="small muted">Les drapeaux ratés</h3><div class="mistakes">${wrong}</div>` : ""}
  </section>`;
}

function renderIntro() {
  const c = S.cur;
  const info = stepInfo(c.step);
  $app.innerHTML = `${topbar(info)}
    ${c.prev ? resultBlock(c.prev) : ""}
    <section class="next-up">
      <p class="small muted">${c.prev ? "Étape suivante" : "À toi de jouer"}</p>
      <h2>${esc(info.title)}</h2>
      <p class="muted">${esc(info.text)}</p>
    </section>
    <button class="btn primary" data-act="begin" autofocus>${esc(info.btn)}</button>`;
}

function renderLearn() {
  const c = S.cur;
  const info = stepInfo(c.step);
  const i = c.order[c.pos];
  const last = c.pos + 1 >= c.order.length;
  preload(c.order[c.pos + 1]);
  $app.innerHTML = `${topbar(info)}
    <section class="stage">
      <div class="dots">${c.order.map((_, k) => `<span class="dot ${k === c.pos ? "cur" : k < c.pos ? "ok" : ""}"></span>`).join("")}</div>
      <p class="counter">Drapeau ${c.pos + 1} / ${c.order.length} · lot ${c.step.lot}</p>
      <img class="flag" src="${flagSrc(i)}" alt="Drapeau : ${esc(COUNTRIES[i].name)}">
      <p class="answer-name">${esc(COUNTRIES[i].name)}</p>
    </section>
    <div class="row">
      <button class="btn" data-act="prev" ${c.pos === 0 ? "disabled" : ""}>← Précédent</button>
      <button class="btn primary" data-act="next">${last ? "Passer au test →" : "Suivant →"}</button>
    </div>`;
}

function dotsHTML(c) {
  return c.order.map((_, k) => {
    const r = c.results[k];
    const cls = r ? (r.ok ? "ok" : "ko") : k === c.pos ? "cur" : "";
    return `<span class="dot ${cls}"></span>`;
  }).join("");
}

function renderQuestion(focus) {
  const c = S.cur;
  const info = stepInfo(c.step);
  const i = c.order[c.pos];
  preload(c.order[c.pos + 1]);
  $app.innerHTML = `${topbar(info)}
    <section class="stage">
      <div class="dots" id="dots">${dotsHTML(c)}</div>
      <p class="counter">Drapeau ${c.pos + 1} / ${c.order.length} · lot ${c.step.lot}</p>
      <div class="timer" id="timer" role="timer" aria-label="Temps restant"><div class="timer-track"><div class="timer-bar" id="tbar"></div></div><span id="tsec">20</span></div>
      <img class="flag" src="${flagSrc(i)}" alt="Drapeau à deviner">
      <form class="answer-form" id="answer-form" autocomplete="off" novalidate>
        <input type="text" id="answer" name="answer" aria-label="Nom du pays" placeholder="Nom du pays"
          autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">
        <div class="feedback" id="feedback" hidden></div>
        <div class="copy" id="copy" hidden></div>
        <div class="row" id="ask-row">
          <button type="button" class="btn ghost" data-act="skip">Je ne sais pas</button>
          <button type="submit" class="btn primary">Valider</button>
        </div>
        <div class="row" id="done-row" hidden>
          <button type="submit" class="btn primary" id="next-btn">Suivant →</button>
        </div>
      </form>
    </section>`;
  if (c.answered) return showFeedback();
  if (c.tries) showTries("");
  if (focus) document.getElementById("answer").focus({ preventScroll: true });
  startTimer();
}

function showFeedback() {
  const c = S.cur;
  const r = c.results[c.pos];
  const idx = c.order[c.pos];
  const form = document.getElementById("answer-form");
  const input = document.getElementById("answer");
  const fb = document.getElementById("feedback");
  const name = esc(COUNTRIES[idx].name);
  form.classList.add(r.ok ? "ok" : "ko");
  input.setAttribute("enterkeyhint", "next");
  fb.className = `feedback ${r.ok ? "ok" : "ko"}`;
  document.getElementById("timer").hidden = true;
  fb.innerHTML = r.ok
    ? `<strong>✓ Bonne réponse</strong><span class="name">${name}</span>`
    : `<strong>${r.timeout ? "⏱ Temps écoulé" : r.given ? "✗ Raté" : "✗ Passé"}</strong><span class="small">C'était :</span> <span class="name">${name}</span>`;
  fb.hidden = false;
  document.getElementById("ask-row").hidden = true;
  const last = c.pos + 1 >= c.order.length;
  document.getElementById("next-btn").textContent = last ? "Voir le résultat →" : "Suivant →";
  document.getElementById("dots").innerHTML = dotsHTML(c);
  if (r.ok) {
    input.readOnly = true;
    input.value = r.given;
    document.getElementById("done-row").hidden = false;
    input.focus({ preventScroll: true });
  } else showCopy();
}

// après une erreur : recopier le nom du pays 3 fois avant de passer au suivant
function showCopy() {
  const c = S.cur;
  const input = document.getElementById("answer");
  const box = document.getElementById("copy");
  const done = (c.copy || 0) >= COPY_TIMES;
  const name = COUNTRIES[c.order[c.pos]].name;
  box.hidden = false;
  box.innerHTML = done
    ? `<strong>C'est noté !</strong>`
    : `<strong>Recopie ${COPY_TIMES} fois : <span class="name">${esc(name)}</span></strong>
       <span class="copy-dots">${Array.from({ length: COPY_TIMES }, (_, k) => `<span class="dot ${k < c.copy ? "ok" : ""}"></span>`).join("")}</span>
       <span class="small" id="copy-msg">${c.copy || 0} / ${COPY_TIMES}</span>`;
  input.value = "";
  input.readOnly = done;
  input.placeholder = done ? "" : `Recopie : ${name}`;
  document.getElementById("done-row").hidden = !done;
  input.focus({ preventScroll: true });
}

function renderComplete() {
  $app.innerHTML = `
    <div class="hero"><h1>Bravo 🎉</h1>
    <p class="muted">Tu as parcouru les ${TOTAL} drapeaux, dans l'ordre du quiz. Il ne reste qu'à tenter le vrai !</p></div>
    ${S.cur.prev ? resultBlock(S.cur.prev) : ""}
    <div class="stack">
      <a class="btn primary" href="https://www.jetpunk.com/user-quizzes/176134/drapeaux-du-monde" target="_blank" rel="noopener">Ouvrir le quiz JetPunk</a>
      <button class="btn" data-act="fullrun">Refaire un parcours complet</button>
      <button class="btn ghost" data-act="home">Accueil</button>
    </div>`;
}

function renderGallery() {
  const sections = Array.from({ length: LOTS }, (_, k) => {
    const n = k + 1;
    const tiles = lotIdx(n).map((i) => `
      <div class="tile"><img src="${flagSrc(i)}" alt="Drapeau : ${esc(COUNTRIES[i].name)}" loading="lazy" decoding="async">
      <span><span class="num">${i + 1}.</span> ${esc(COUNTRIES[i].name)}</span></div>`).join("");
    return `<section class="gallery-lot"><h3>Lot ${n}</h3><div class="grid">${tiles}</div></section>`;
  }).join("");
  $app.innerHTML = `<header class="topbar"><button class="btn ghost small" data-act="home">← Accueil</button><span class="chip">Tous les drapeaux</span></header>${sections}`;
}

/* ---------- Événements ---------- */

$app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  switch (b.dataset.act) {
    case "home": view = "home"; render(); break;
    case "gallery": view = "gallery"; render(); break;
    case "settings": $interval.value = String(S.interval); $settings.showModal(); break;
    case "continue":
      view = "session";
      if (!S.cur) { const s = nextStep(); if (s) return startStep(s, null); }
      render(true);
      break;
    case "begin": begin(); break;
    case "next": next(); break;
    case "prev": if (S.cur.pos > 0) { S.cur.pos--; save(); render(); } break;
    case "skip": finalize({ ok: false, given: "" }); break;
    case "fullrun":
      S.runFails = [];
      S.queue = runSteps(LOTS);
      startStep(S.queue.shift(), null);
      break;
  }
});

$app.addEventListener("submit", (e) => {
  e.preventDefault();
  const c = S.cur;
  if (!c || c.phase !== "quiz") return;
  if (needsCopy(c)) return copyAttempt(document.getElementById("answer").value);
  if (c.answered) return next();
  submitAnswer(document.getElementById("answer").value);
});

// validation automatique dès que le mot est le bon
$app.addEventListener("input", (e) => {
  const c = S.cur;
  if (e.target.id !== "answer" || e.isComposing || !c || c.phase !== "quiz") return;
  const v = e.target.value.trim();
  if (c.answered) {
    if (needsCopy(c) && v && isName(v, c.order[c.pos])) copyAttempt(v);
    return;
  }
  if (v && isExact(v, c.order[c.pos])) finalize({ ok: true, given: v });
});

document.addEventListener("keydown", (e) => {
  if (view !== "session" || !S.cur || $settings.open) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (S.cur.phase === "learn") {
    if (e.key === "Enter" || e.key === "ArrowRight") { if (tag !== "BUTTON" || e.key !== "Enter") { e.preventDefault(); next(); } }
    else if (e.key === "ArrowLeft" && S.cur.pos > 0) { S.cur.pos--; save(); render(); }
  } else if (S.cur.phase === "quiz" && S.cur.answered && e.key === "Enter" && tag !== "INPUT" && tag !== "BUTTON") {
    e.preventDefault();
    next();
  }
});

$interval.addEventListener("change", () => { S.interval = Number($interval.value); save(); if (view === "home") render(); });
document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("Effacer toute ta progression ?")) return;
  S = fresh(S.interval);
  save();
  $settings.close();
  view = "home";
  render();
});

render();
