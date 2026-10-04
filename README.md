# Drapeaux du monde

Site statique (PC + iPhone) pour apprendre les 196 drapeaux du quiz
[JetPunk « Drapeaux du Monde »](https://www.jetpunk.com/user-quizzes/176134/drapeaux-du-monde),
dans le même ordre, lot par lot (10 drapeaux).

## Règles
- Nouveau lot : les drapeaux sont présentés avec leur nom, puis test du lot, puis révision du lot précédent.
- Une erreur : on finit le lot, on le refait, puis on recule au lot précédent.
- Tous les 5 lots (réglable) : on repart de zéro, lots 1 à N d'affilée.
- Pendant un test : validation automatique dès que le nom est exact, 20 secondes par drapeau (temps écoulé = faux), 3 essais quand on valide un mauvais nom.
- Réponses très tolérantes : accents, majuscules, abréviations (USA, RDC…), noms anglais, fautes de frappe.

La progression est sauvegardée dans le navigateur (`localStorage`).

## Développement
```sh
python3 -m http.server 8000   # puis http://localhost:8000
node test-match.mjs           # tests de la tolérance orthographique
```

Drapeaux : [flag-icons](https://github.com/lipis/flag-icons) (MIT), voir `LICENSE-flag-icons.txt`.
