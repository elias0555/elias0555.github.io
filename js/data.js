// ============================================================================
//  ACCÈS AUX DONNÉES (lecture publique) + petits utilitaires partagés
// ============================================================================
import { db } from "../firebase-config.js";
import {
  collection, getDocs, query, orderBy, where, limit, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Récupère tous les projets, triés par "order" croissant.
export async function fetchProjects() {
  const q = query(collection(db, "projects"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Récupère un projet par son slug (utilisé en secours).
export async function fetchProjectBySlug(slug) {
  const q = query(collection(db, "projects"), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// Récupère les réglages du site (contact, liens, CV). Renvoie {} si absent.
export async function fetchSettings() {
  const snap = await getDoc(doc(db, "settings", "site"));
  return snap.exists() ? snap.data() : {};
}

// Extrait l'ID YouTube depuis une URL ou un ID brut. Renvoie "" si rien.
export function youtubeId(input) {
  if (!input) return "";
  input = String(input).trim();
  if (/^[\w-]{11}$/.test(input)) return input;
  const m = input.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : "";
}

// Échappe le HTML pour une insertion sûre via innerHTML.
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
