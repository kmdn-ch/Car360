# Car360

Application PWA & Android (Capacitor) de gestion personnelle de véhicule fonctionnant 100 % hors-ligne.

> **Version publique anonymisée :** ce dépôt contient uniquement des données de démonstration fictives, sans documents personnels ni photos de véhicule.

## Fonctionnalités

- **Aperçu** : compteur kilométrique, rythme annuel et jauge par rapport au plafond cible, état des roues montées et alertes actives.
- **Assurances & Sinistres** : assistant d'incident par type de sinistre, numéros d'urgence, couvertures RC / Casco / protection juridique et dépannage.
- **Entretien & Pneus** : journal des interventions, échéances CBS / expertise (MFK), gestion des jeux été/hiver et rappels `.ics`.
- **Leasing** : simulateur rachat anticipé vs restitution avec courbe d'évolution nette et paramètres éditables.
- **Documents** : coffre local hors-ligne (IndexedDB) pour vos PDF/images personnels, suivi des garanties et sauvegarde/importation JSON complète.

## Stack technique

- **Frontend** : React 19, TypeScript, Vite 7, Tailwind CSS 4, Recharts, Lucide React
- **Hors-ligne & Mobile** : `vite-plugin-pwa` (Workbox), Capacitor 8 (`@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`)

## Développement local

```bash
npm ci
npm run dev
```

Build web & synchronisation Android :

```bash
npm run build
npx cap sync android
```

Pour générer un APK localement (JDK 21 & Android SDK 36 requis) :

```bash
cd android
./gradlew assembleDebug
```

## Compilation automatique APK (GitHub Actions)

Le workflow [.github/workflows/build-android.yml](.github/workflows/build-android.yml) compile automatiquement l'APK Android à chaque push sur `main` ou `test` et le publie en **Artifact** ainsi que dans les **GitHub Releases** (`apk-main` / `apk-test`).
