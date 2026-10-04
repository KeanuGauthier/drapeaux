import { COUNTRIES } from "./data.js";
import { isCorrect, keysOf, tolerance } from "./match.js";
const find = (n) => COUNTRIES.findIndex((c) => c.name === n);
const cases = [
  ["États-Unis","usa",1],["États-Unis","etats unis",1],["États-Unis","les états-unis",1],["États-Unis","etat unis",1],
  ["République Démocratique du Congo","RDC",1],["République Démocratique du Congo","republique democratique du congo",1],
  ["République Démocratique du Congo","rep dem du congo",1],["République Démocratique du Congo","republik democratique congo",1],
  ["République du Congo","congo",1],["République Démocratique du Congo","congo",0],
  ["Côte d'Ivoire","cote d ivoire",1],["Côte d'Ivoire","cote divoire",1],["Côte d'Ivoire","coted'ivoire",1],
  ["Arabie Saoudite","arabie saudite",1],["Thaïlande","tailande",1],["Thaïlande","thailande",1],["Chili","chilie",1],
  ["Azerbaïdjan","azerbaidjan",1],["Azerbaïdjan","azerbaijan",1],["Kazakhstan","kazakstan",1],["Kazakhstan","kazakhtan",1],
  ["Niger","nigeria",0],["Nigeria","niger",0],["Niger","niger",1],["Nigeria","nigerya",1],["Soudan","soudan du sud",0],["Soudan du Sud","soudan",0],
  ["Soudan du Sud","sud soudan",1],["Guinée","guinée bissau",0],["Guinée-Bissau","guinee bissau",1],["Guinée","guinee",1],["Guinée Équatoriale","guinee equatoriale",1],
  ["Dominique","dominicaine",0],["République Dominicaine","dominicaine",1],["Dominique","dominique",1],
  ["Mali","malie",0],["Malte","mlate",1],["Mali","malte",0],["Cuba","cube",1],["Oman","omane",1],
  ["Saint-Marin","saint marin",1],["Saint-Marin","st marin",1],["Saint-Marin","san marino",1],
  ["Îles Marshall","marshall",1],["Salomon","iles salomon",1],["Salomon","salomon",1],
  ["Macédoine du Nord","macedoine",1],["Macédoine du Nord","macedoine du nord",1],
  ["Émirats Arabes Unis","emirats arabes unis",1],["Émirats Arabes Unis","eau",1],["Émirats Arabes Unis","emirat arabe uni",1],
  ["Royaume-Uni","uk",1],["Royaume-Uni","angleterre",1],["Royaume-Uni","royaume uni",1],["Pays-Bas","pays bas",1],["Pays-Bas","hollande",1],
  ["Viêt Nam","vietnam",1],["Viêt Nam","viet nam",1],["Birmanie","myanmar",1],["Taïwan","taiwan",1],
  ["Eswatini","swaziland",1],["Eswatini","eswatiny",1],["Cap-Vert","cap vert",1],["Cap-Vert","capvert",1],
  ["Papouasie-Nouvelle-Guinée","papouasie nouvelle guinee",1],["Papouasie-Nouvelle-Guinée","papouasie",1],["Papouasie-Nouvelle-Guinée","papoasie nouvel guinee",1],
  ["Saint-Christophe-et-Niévès","saint kitts",1],["Saint-Vincent-et-les-Grenadines","saint vincent",1],["Sainte-Lucie","saint lucie",1],
  ["Trinité-et-Tobago","trinidad",1],["Bosnie-Herzégovine","bosnie",1],["Sao Tomé-et-Principe","sao tome",1],
  ["États Fédérés de Micronésie","micronesie",1],["Antigua-et-Barbuda","antigua",1],["République Centrafricaine","centrafrique",1],
  ["République Tchèque","tchequie",1],["République Tchèque","republique tcheque",1],
  ["Biélorussie","belarus",1],["Biélorussie","bielorusie",1],["Timor Oriental","timor leste",1],["Salvador","el salvador",1],
  ["Corée du Sud","coree du sud",1],["Corée du Sud","coree du nord",0],["Corée du Nord","coree nord",1],["Corée du Sud","coree",0],
  ["Afrique du Sud","afrique du sud",1],["Afrique du Sud","afrik du sud",1],["Nouvelle-Zélande","nouvelle zelande",1],["Nouvelle-Zélande","nouvelle zeland",1],
  ["Inde","indes",1],["Iran","irak",0],["Irak","iran",0],["Autriche","australie",0],["Australie","autralie",1],["Slovaquie","slovenie",0],["Slovénie","slovaquie",0],
  ["Maurice","mauritanie",0],["Mauritanie","mauritanie",1],["Mauritanie","mauritani",1],["Guyana","guyane",0],
  ["Sierra Leone","sierra leon",1],["Philippines","philipines",1],["Philippines","filipines",1],["Qatar","katar",1],["Bahreïn","bahrein",1],
  ["Luxembourg","luxembour",1],["Liechtenstein","lichtenstein",1],["Turkménistan","turkmenistan",1],["Ouzbékistan","ouzbekistan",1],["Ouzbékistan","uzbekistan",1],
  ["Kirghizistan","kirghizstan",1],["Tadjikistan","tadjikistan",1],["Tadjikistan","tajikistan",1],["Burkina Faso","burkina",1],["Burkina Faso","burkinafaso",1],
  ["Allemagne","alemagne",1],["Suisse","suiss",1],["Suède","suisse",0],["Géorgie","georgie",1],["Hongrie","hongri",1],["Panama","panamas",1],
];
let bad = 0;
for (const [n, inp, exp] of cases) {
  const i = find(n);
  if (i < 0) { console.log("INTROUVABLE", n); bad++; continue; }
  const got = isCorrect(inp, i) ? 1 : 0;
  if (got !== exp) { console.log("ÉCHEC", n, "<-", inp, "attendu", exp); bad++; }
}
// chaque nom officiel doit passer pour lui-même
COUNTRIES.forEach((c, i) => { for (const a of [c.name, ...c.aliases]) if (!isCorrect(a, i)) { console.log("ALIAS KO", c.name, a); bad++; } });
// collisions de clés exactes entre pays
const seen = new Map();
COUNTRIES.forEach((c, i) => { for (const a of [c.name, ...c.aliases]) for (const k of keysOf(a)) { if (seen.has(k) && seen.get(k) !== i) console.log("COLLISION", k, COUNTRIES[seen.get(k)].name, "/", c.name); seen.set(k, i); } });
console.log(COUNTRIES.length, "pays,", bad, "problèmes");
