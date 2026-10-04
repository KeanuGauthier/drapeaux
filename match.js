// Comparaison d'une saisie avec le nom d'un pays : accents, majuscules, ponctuation, abréviations et quelques fautes de frappe.
import { COUNTRIES } from "./data.js";

const STOP = new Set(["le", "la", "les", "l", "de", "du", "des", "d", "et", "and", "of", "the", "un", "une", "en", "au", "aux", "el"]);

const ABBR = { saint: "st", sainte: "st", ste: "st", rep: "republique", dem: "democratique", rd: "democratique" };

function tokens(s) {
  return s
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (ABBR[t] ?? t));
}

export function keysOf(s) {
  const t = tokens(s);
  if (!t.length) return [];
  const joined = t.join("");
  const sorted = [...t].sort().join("");
  return joined === sorted ? [joined] : [joined, sorted];
}

// Distance de Damerau-Levenshtein (transposition = 1)
function dist(a, b, max) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return Infinity;
  let prev2 = null;
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    const cur = [i];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[lb];
}

export const tolerance = (len) => (len <= 4 ? 0 : len <= 7 ? 1 : len <= 11 ? 2 : 3);

const INDEX = COUNTRIES.map((c) => [...new Set([c.name, ...c.aliases].flatMap(keysOf))]);

// Vrai si la saisie désigne le pays `idx` (et pas un autre pays plus proche).
export function isCorrect(input, idx) {
  const ks = keysOf(input);
  if (!ks.length) return false;
  if (ks.some((k) => INDEX[idx].includes(k))) return true;
  let best = Infinity, bestOk = false, bestIdx = -1, tie = false;
  INDEX.forEach((aliases, i) => {
    let d = Infinity, ok = false;
    for (const k of ks) for (const a of aliases) {
      const tol = tolerance(Math.min(a.length, Math.max(k.length, a.length)));
      const dd = dist(k, a, tol + 1);
      if (dd < d) d = dd;
      if (dd <= tol) ok = true;
    }
    if (d < best) { best = d; bestOk = ok; bestIdx = i; tie = false; }
    else if (d === best) tie = true;
  });
  return bestIdx === idx && !tie && bestOk;
}

// Correspondance exacte (sans faute) : sert à la validation automatique pendant la frappe
export function isExact(input, idx) {
  return keysOf(input).some((k) => INDEX[idx].includes(k));
}

// Le nom officiel recopié (pas un alias) : sert à la recopie après une erreur
export function isName(input, idx) {
  const ks = keysOf(input);
  const names = keysOf(COUNTRIES[idx].name);
  return ks.some((k) => names.includes(k));
}
