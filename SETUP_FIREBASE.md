# 🔧 Mise en place de Firebase — guide pas à pas

Ce guide te fait passer de **zéro** à un **espace admin fonctionnel et sécurisé**.
Compte ~20 minutes. Suis les étapes **dans l'ordre**.

> 💡 Vocabulaire : la **console Firebase** = le site web `console.firebase.google.com` où tu
> configures tout. Le **code** = les fichiers de ce dossier (déjà prêts, tu ne touches qu'à
> `firebase-config.js`).

---

## Étape 1 — Créer le projet Firebase

1. Va sur **https://console.firebase.google.com** (connecte-toi avec ton compte Google).
2. Clique **« Ajouter un projet »** (*Add project*).
3. Nom : par ex. `portfolio-elias`. Clique **Continuer**.
4. Google Analytics : **désactive-le** (inutile ici), puis **Créer le projet**.

---

## Étape 2 — Ajouter une app Web et récupérer la config

1. Sur la page d'accueil du projet, clique l'icône **`</>`** (« Web »).
2. Surnom de l'app : `portfolio`. **Ne coche PAS** « Firebase Hosting ». Clique **Enregistrer**.
3. Firebase affiche un objet `firebaseConfig` qui ressemble à ça :

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy....",
     authDomain: "portfolio-elias.firebaseapp.com",
     projectId: "portfolio-elias",
     storageBucket: "portfolio-elias.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

4. **Copie ces valeurs** dans le fichier **`firebase-config.js`** de ce dossier, à la place des
   `"REMPLACE_MOI"`. ⚠️ Recopie le `storageBucket` **exactement** comme affiché (selon ton projet
   ça peut finir par `.appspot.com` **ou** `.firebasestorage.app`).

> 🔒 Pas d'inquiétude : la `apiKey` est **publique** par nature, ce n'est pas un mot de passe.
> La sécurité réelle vient des **règles** (étape 8) + de la **connexion Google**.

---

## Étape 3 — Activer la connexion Google

1. Menu de gauche → **Build → Authentication** → **Get started**.
2. Onglet **Sign-in method** → clique **Google** → **Activer** (*Enable*).
3. Choisis un « email d'assistance du projet » (ton email), puis **Enregistrer**.

---

## Étape 4 — Créer la base Firestore

1. Menu de gauche → **Build → Firestore Database** → **Create database**.
2. Choisis le mode **Production** (on mettra les règles juste après).
3. Région : **`eur3` (europe-west)** ou `europe-west1`. Clique **Enable**.

---

## Étape 5 — Activer le stockage des images (Storage)

> Le stockage d'images nécessite le plan **Blaze** (« paiement à l'usage »). En pratique tu restes
> **gratuit** tant que tu ne dépasses pas le quota (≈ 5 Go), ce qui est énorme pour un portfolio.
> Une carte bancaire est demandée mais ne sera pas débitée sous le quota.

1. Menu de gauche → **Build → Storage** → **Get started**.
2. Si demandé, clique **Upgrade project** → choisis le plan **Blaze** → ajoute un moyen de paiement.
   - Optionnel : mets une **alerte de budget à 1 €** pour être 100 % tranquille.
3. Reviens sur **Storage** → **Get started** → mode **Production** → même région que Firestore → **Done**.

---

## Étape 6 — Lancer le site en local

Les fichiers utilisent des **modules JavaScript** : ils ne marchent pas en double-cliquant le `.html`
(il faut un petit serveur). Au choix :

- **VS Code** : installe l'extension **« Live Server »**, clic droit sur `admin.html` → *Open with Live Server*.
- **ou** dans un terminal, dans ce dossier :
  ```bash
  python -m http.server 5500
  ```
  puis ouvre **http://localhost:5500/admin.html**

> ⚠️ **Important** : ouvre bien l'adresse avec **`localhost`** (et non `127.0.0.1`). Firebase
> autorise `localhost` par défaut, mais **pas** `127.0.0.1` → sinon erreur `auth/unauthorized-domain`.
> (Live Server utilise souvent `127.0.0.1` : corrige juste l'URL en `localhost`, ou ajoute
> `127.0.0.1` dans *Authentication → Settings → Authorized domains*.)

---

## Étape 7 — Première connexion → récupérer ton UID

1. Ouvre **`admin.html`** (via le serveur local) → clique **« Se connecter avec Google »**.
2. Une fois connecté, un **bandeau orange** affiche ton **UID** (une longue suite de caractères).
3. **Copie cet UID** et colle-le dans **`firebase-config.js`** à la ligne :
   ```js
   export const OWNER_UID = "colle-ton-uid-ici";
   ```
4. **Recharge** la page : le bandeau disparaît, tu es désormais le **seul** autorisé.

---

## Étape 8 — Coller les règles de sécurité 🔒

C'est **l'étape clé de la sécurité**. Remplace `TON_UID` par ton UID (le même qu'à l'étape 7)
dans les deux blocs ci-dessous.

### Firestore — onglet *Firestore Database → Rules*
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{doc} {
      allow read: if true;                                  // lecture publique (le site)
      allow write: if request.auth != null
                   && request.auth.uid == "TON_UID";        // écriture = toi uniquement
    }
  }
}
```
Clique **Publish**.

### Storage — onglet *Storage → Rules*
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;                                  // images visibles publiquement
      allow write: if request.auth != null
                   && request.auth.uid == "TON_UID";        // upload = toi uniquement
    }
  }
}
```
Clique **Publish**.

> Résultat : n'importe qui peut **voir** le site, mais **toi seul** (connecté avec ton compte
> Google) peux ajouter / modifier / supprimer. Même quelqu'un qui copierait ta `apiKey` ne pourrait
> rien écrire.

---

## Étape 9 — Importer tes 7 projets existants

1. Dans `admin.html` (connecté), clique **« ⬇ Importer mes projets existants »**.
2. Confirme. Tes 7 projets actuels apparaissent dans la liste de gauche. 🎉
3. Ouvre `index.html` (toujours via le serveur local) : la grille s'affiche, **identique** à avant,
   mais alimentée par la base.

> Les images des anciens projets continuent de pointer vers le dossier `assets/`. Pour les
> **nouveaux** projets, l'admin uploadera les images dans Firebase Storage automatiquement.

---

## Étape 10 — Mettre en ligne (GitHub Pages)

1. Dans la console Firebase → **Authentication → Settings → Authorized domains** → **Add domain**
   → saisis **`elias0555.github.io`**. (Sans ça, la connexion Google échouerait en ligne.)
2. Commit + push tes fichiers sur la branche servie par GitHub Pages (`main`).
3. Ouvre `https://elias0555.github.io/admin.html` et reteste une connexion + une modif.

---

## ✅ Utilisation au quotidien (le but de tout ça !)

Pour **ajouter un projet**, désormais :
1. Ouvre `admin.html`, connecte-toi.
2. Clique **« + Nouveau »**.
3. Remplis le titre (le *slug* se génère tout seul), clique les **tags presets**, glisse ta
   **miniature** et tes **captures**, colle un **lien YouTube**, ajoute des **blocs « Détails techniques »**.
4. Clique **💾 Enregistrer**. Le projet est **immédiatement** visible sur le site. Fini le HTML à la main !

Pour **modifier** : clique un projet dans la liste, change, **Enregistrer**.
Pour **supprimer** : ouvre-le → **Supprimer**.

---

## 🛡️ Durcissement optionnel (recommandé plus tard)

- **Restreindre la clé API** : Google Cloud Console → *APIs & Services → Credentials* → ta clé →
  *Application restrictions: HTTP referrers* → ajoute `elias0555.github.io/*` et `localhost:5500/*`.
- **App Check** (anti-abus) : Firebase → *App Check* → enregistre l'app avec **reCAPTCHA v3**.

---

## ❓ En cas de souci

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page admin blanche | modules chargés en `file://` | passe par un serveur local (étape 6) |
| `auth/invalid-api-key` | `firebase-config.js` mal rempli | recopie la config (étape 2) |
| `auth/unauthorized-domain` en local | URL en `127.0.0.1` | utilise `localhost` à la place, ou ajoute `127.0.0.1` dans Authorized domains |
| `auth/unauthorized-domain` en ligne | domaine non autorisé | ajoute le domaine (étape 10) |
| Écriture refusée / `permission-denied` | règles ou `OWNER_UID` faux | revérifie l'UID dans les règles **et** `firebase-config.js` |
| Upload image échoue | Storage non activé / pas Blaze | refais l'étape 5 |
