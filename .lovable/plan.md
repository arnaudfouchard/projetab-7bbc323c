

## Probleme

Le mode exploration saute actuellement la sélection d'entité : Dashboard → choix du module → module (sans contexte d'établissement). Le parcours attendu est :

```text
Dashboard → /explore (choix du module)
         → /explore/select-entity (choix établissement/GHT)
         → /explore/:module?finess=...&name=... (module standalone avec contexte)
```

## Plan

### 1. Modifier le flux de navigation dans `Explore.tsx`

Quand l'utilisateur clique "Explorer" après avoir sélectionné un module, au lieu de naviguer directement vers `/explore/:module`, rediriger vers une étape de sélection d'entité. Deux options :

- **Option retenue** : Réutiliser la page `SelectEntity` existante avec `mode=exploration` et passer le module sélectionné en query param. Modifier `SelectEntity` pour que le bouton "Continuer" redirige vers `/explore/:module?finess=...&name=...` au lieu de `/projects/select-modules` quand le mode est exploration.

### 2. Modifier `SelectEntity.tsx`

- Lire un nouveau query param `module` (le module choisi)
- Quand `mode=exploration` et qu'une entité est sélectionnée, le bouton "Continuer" navigue vers `/explore/{module}?finess={finess}&name={nom}` au lieu de `/projects/select-modules`

### 3. Modifier `Explore.tsx` (vue module `/explore/:module`)

- Lire les query params `finess` et `name` depuis l'URL
- Afficher le nom de l'entité sélectionnée dans l'en-tête du module (sous le titre)
- Passer le FINESS au composant module (pour l'instant les modules utilisent des données mock, mais la structure sera prête)

### 4. Modifier `Dashboard.tsx`

- Le lien "Mode exploration" reste `/explore` (pas de changement)

### Fichiers modifies

- `src/pages/Explore.tsx` : handleExplore navigue vers `/projects/select-entity?mode=exploration&module={selected}` ; la vue module lit finess/name des query params et les affiche
- `src/pages/SelectEntity.tsx` : gere le cas `mode=exploration` avec redirection vers `/explore/{module}`

