// ============================================================================
//  CONFIGURATION FIREBASE
// ----------------------------------------------------------------------------
//  👉 Remplis les valeurs ci-dessous avec celles de TA console Firebase.
//     (Étapes détaillées dans SETUP_FIREBASE.md)
//
//  ⚠️ La clé "apiKey" n'est PAS un secret : c'est un identifiant public, c'est
//     normal qu'elle soit visible. La vraie sécurité vient des RÈGLES Firestore
//     et Storage + de l'authentification (voir SETUP_FIREBASE.md).
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- 1) Colle ici l'objet firebaseConfig donné par la console (étape 2 du guide)

const firebaseConfig = {

  apiKey: "AIzaSyCTNLEmbWhJG8ShUFZhmhPh7VTOUlpQ0_0",

  authDomain: "portfolio-7046f.firebaseapp.com",

  projectId: "portfolio-7046f",

  storageBucket: "portfolio-7046f.firebasestorage.app",

  messagingSenderId: "573557558048",

  appId: "1:573557558048:web:5ac974b8b6e38331e5a545",

  measurementId: "G-SKH7XNQY4R"

};

// --- 2) Ton UID Google (récupéré à ta 1ère connexion sur admin.html, étape 7)
//        Tant que c'est "REMPLACE_MOI", l'admin affiche ton UID pour le copier.
export const OWNER_UID = "Sy9igSHfnZh8dYlcJbJCU6f4jBP2";

// --- Initialisation (ne pas modifier) -------------------------------------
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const OWNER_CONFIGURED = OWNER_UID && OWNER_UID !== "REMPLACE_MOI";
