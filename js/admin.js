// ============================================================================
//  ADMIN — connexion Google sécurisée + CRUD projets (Firestore + Storage)
// ============================================================================
import { auth, db, storage, googleProvider, OWNER_UID, OWNER_CONFIGURED } from "../firebase-config.js";
import {
  onAuthStateChanged, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { seedProjects } from "./seed.js";
import { youtubeId } from "./data.js";

// ---------------------------------------------------------------------------
//  PRESETS (modifie librement cette liste)
// ---------------------------------------------------------------------------
const TAG_PRESETS = {
  "code-skill":   ["C#", "C++", "Python", "GDScript", "Git"],
  "editor-skill": ["Unity", "Godot", "Unreal"],
  "asset-skill":  ["Blender", "Aseprite", "Procreate", "Photoshop", "Krita", "Audacity"],
  "tool-skill":   ["Office Suite"]
};
const TYPE_LABEL = {
  "code-skill": "Code", "editor-skill": "Moteur", "asset-skill": "Asset", "tool-skill": "Outil"
};

// ---------------------------------------------------------------------------
//  ÉTAT
// ---------------------------------------------------------------------------
let allProjects = [];
let editingId = null;          // slug du projet en cours d'édition (null = nouveau)
let selectedTags = [];         // [{label, type}]
let features = [];             // [{heading, text, bullets}]
let thumbItem = null;          // {url} | {file, preview} | null
let galleryItems = [];         // [{url} | {file, preview}]

// ---------------------------------------------------------------------------
//  RACCOURCIS DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const loginView = $("login-view");
const adminView = $("admin-view");
const overlay = $("loading-overlay");

function showLoading(text = "Chargement…") { $("loading-text").textContent = text; overlay.hidden = false; }
function hideLoading() { overlay.hidden = true; }
function status(msg, isError = false) {
  const el = $("form-status");
  el.textContent = msg;
  el.classList.toggle("is-error", isError);
}

// ===========================================================================
//  AUTHENTIFICATION
// ===========================================================================
$("login-btn").addEventListener("click", async () => {
  $("login-error").textContent = "";
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error(err);
    $("login-error").textContent = "Échec de la connexion : " + err.message;
  }
});

$("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    adminView.hidden = true;
    loginView.hidden = false;
    return;
  }

  // Bandeau UID : affiché tant que OWNER_UID n'est pas renseigné
  const banner = $("uid-banner");
  if (!OWNER_CONFIGURED) {
    banner.hidden = false;
    banner.innerHTML =
      `⚠️ <strong>Configuration à terminer.</strong> Ton UID est :
       <code class="uid-code">${user.uid}</code>
       — copie-le dans <code>firebase-config.js</code> (OWNER_UID) ET dans tes règles Firestore/Storage,
       puis recharge la page. (Voir SETUP_FIREBASE.md)`;
  } else if (user.uid !== OWNER_UID) {
    // Connecté mais pas le propriétaire → accès refusé
    alert("Accès refusé : ce compte n'est pas autorisé.");
    await signOut(auth);
    return;
  } else {
    banner.hidden = true;
  }

  // Accès accordé
  loginView.hidden = true;
  adminView.hidden = false;
  $("user-label").textContent = user.email || user.uid;
  buildTagPresets();
  await loadProjects();
});

// ===========================================================================
//  LISTE DES PROJETS
// ===========================================================================
async function loadProjects() {
  try {
    const q = query(collection(db, "projects"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    allProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(err);
    allProjects = [];
  }
  renderProjectList();
}

function renderProjectList() {
  const ul = $("project-list");
  ul.innerHTML = "";
  if (allProjects.length === 0) {
    ul.innerHTML = `<li class="empty-hint">Aucun projet. Importe les existants ou crée-en un.</li>`;
    return;
  }
  allProjects.forEach(p => {
    const li = document.createElement("li");
    li.className = "project-list-item" + (p.id === editingId ? " active" : "");
    const star = p.featured ? "★ " : "";
    li.innerHTML = `
      <img src="${p.thumbnail || ""}" alt="" onerror="this.style.visibility='hidden'">
      <div class="pli-meta">
        <strong>${star}${escapeText(p.title)}</strong>
        <small>${escapeText(p.slug)}</small>
      </div>`;
    li.addEventListener("click", () => loadIntoForm(p));
    ul.appendChild(li);
  });
}

// ===========================================================================
//  PRESETS DE TAGS
// ===========================================================================
function buildTagPresets() {
  const container = $("tag-presets");
  container.innerHTML = "";
  Object.entries(TAG_PRESETS).forEach(([type, labels]) => {
    labels.forEach(label => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `tag-chip ${type}`;
      chip.textContent = label;
      chip.addEventListener("click", () => toggleTag(label, type));
      container.appendChild(chip);
    });
  });
}

function toggleTag(label, type) {
  const i = selectedTags.findIndex(t => t.label === label && t.type === type);
  if (i >= 0) selectedTags.splice(i, 1);
  else selectedTags.push({ label, type });
  renderSelectedTags();
}

function renderSelectedTags() {
  const wrap = $("tag-selected");
  wrap.innerHTML = "";
  selectedTags.forEach((t, i) => {
    const chip = document.createElement("span");
    chip.className = `tag-chip selected ${t.type}`;
    chip.innerHTML = `${escapeText(t.label)} <b>×</b>`;
    chip.addEventListener("click", () => { selectedTags.splice(i, 1); renderSelectedTags(); syncPresetStates(); });
    wrap.appendChild(chip);
  });
  syncPresetStates();
}

function syncPresetStates() {
  document.querySelectorAll("#tag-presets .tag-chip").forEach(chip => {
    const active = selectedTags.some(t => t.label === chip.textContent);
    chip.classList.toggle("is-active", active);
  });
}

$("tag-add-btn").addEventListener("click", () => {
  const input = $("tag-custom-input");
  const label = input.value.trim();
  const type = $("tag-type").value;
  if (!label) return;
  if (!selectedTags.some(t => t.label === label && t.type === type)) {
    selectedTags.push({ label, type });
    renderSelectedTags();
  }
  input.value = "";
});

// ===========================================================================
//  DÉTAILS TECHNIQUES (features)
// ===========================================================================
$("add-feature-btn").addEventListener("click", () => { features.push({ heading: "", text: "", bullets: "" }); renderFeatures(); });

function renderFeatures() {
  const wrap = $("features-container");
  wrap.innerHTML = "";
  features.forEach((f, i) => {
    const block = document.createElement("div");
    block.className = "feature-edit";
    block.innerHTML = `
      <div class="feature-edit-head">
        <input type="text" class="feat-heading" placeholder="Titre du bloc (ex: Enemy AI)" value="${escapeAttr(f.heading)}">
        <button type="button" class="btn btn-danger btn-xs feat-del">✕</button>
      </div>
      <textarea class="feat-text" rows="2" placeholder="Description…">${escapeText(f.text)}</textarea>
      <textarea class="feat-bullets" rows="3" placeholder="Un point par ligne…">${escapeText(f.bullets)}</textarea>`;
    block.querySelector(".feat-heading").addEventListener("input", e => f.heading = e.target.value);
    block.querySelector(".feat-text").addEventListener("input", e => f.text = e.target.value);
    block.querySelector(".feat-bullets").addEventListener("input", e => f.bullets = e.target.value);
    block.querySelector(".feat-del").addEventListener("click", () => { features.splice(i, 1); renderFeatures(); });
    wrap.appendChild(block);
  });
}

// ===========================================================================
//  UPLOAD IMAGES (miniature + galerie) — preview immédiat, upload à la sauvegarde
// ===========================================================================
function setupDropzone(dropId, inputId, onFiles, multiple) {
  const drop = $(dropId), input = $(inputId);
  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { onFiles([...input.files]); input.value = ""; });
  ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("dragover"); }));
  drop.addEventListener("drop", e => {
    const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
    if (files.length) onFiles(multiple ? files : [files[0]]);
  });
}

setupDropzone("thumb-drop", "thumb-input", (files) => {
  if (!files[0]) return;
  thumbItem = { file: files[0], preview: URL.createObjectURL(files[0]) };
  renderThumb();
}, false);

setupDropzone("gallery-drop", "gallery-input", (files) => {
  files.forEach(f => galleryItems.push({ file: f, preview: URL.createObjectURL(f) }));
  renderGallery();
}, true);

function renderThumb() {
  const wrap = $("thumb-preview");
  const src = thumbItem ? (thumbItem.url || thumbItem.preview) : "";
  wrap.innerHTML = src ? `<img src="${src}" alt="miniature">` : "";
}

function renderGallery() {
  const wrap = $("gallery-preview");
  wrap.innerHTML = "";
  galleryItems.forEach((g, i) => {
    const cell = document.createElement("div");
    cell.className = "gallery-cell";
    cell.innerHTML = `<img src="${g.url || g.preview}" alt="">
      <button type="button" class="gallery-del" title="Retirer">✕</button>`;
    cell.querySelector(".gallery-del").addEventListener("click", () => { galleryItems.splice(i, 1); renderGallery(); });
    wrap.appendChild(cell);
  });
}

async function uploadFile(file, slug, kind) {
  const safe = file.name.replace(/[^\w.\-]/g, "_");
  const r = ref(storage, `projects/${slug}/${kind}_${Date.now()}_${safe}`);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

// ===========================================================================
//  FORMULAIRE : nouveau / charger / collecter / enregistrer / supprimer
// ===========================================================================
function showForm() { $("project-form").hidden = false; $("form-placeholder").hidden = true; }

function resetForm() {
  editingId = null;
  selectedTags = []; features = []; thumbItem = null; galleryItems = [];
  $("project-form").reset();
  $("form-title").textContent = "Nouveau projet";
  $("delete-btn").hidden = true;
  status("");
  renderSelectedTags(); renderFeatures(); renderThumb(); renderGallery();
  renderProjectList();
}

// Auto-slug depuis le titre (uniquement en création)
$("f-title").addEventListener("input", () => {
  if (editingId) return;
  $("f-slug").value = slugify($("f-title").value);
});

$("new-btn").addEventListener("click", () => { resetForm(); showForm(); });
$("cancel-btn").addEventListener("click", () => { resetForm(); $("project-form").hidden = true; $("form-placeholder").hidden = false; });

function loadIntoForm(p) {
  editingId = p.id;
  $("form-title").textContent = `Modifier : ${p.title}`;
  $("f-title").value = p.title || "";
  $("f-slug").value = p.slug || p.id || "";
  $("f-subtitle").value = p.subtitle || "";
  $("f-genre").value = p.genre || "";
  $("f-bullets").value = (p.cardBullets || []).join("\n");
  $("f-overview").value = p.overview || "";
  $("f-youtube").value = p.youtubeId || "";
  $("f-featured").checked = !!p.featured;
  $("f-order").value = p.order ?? 0;

  selectedTags = (p.tags || []).map(t => ({ label: t.label, type: t.type }));
  features = (p.features || []).map(f => ({ heading: f.heading || "", text: f.text || "", bullets: (f.bullets || []).join("\n") }));
  thumbItem = p.thumbnail ? { url: p.thumbnail } : null;
  galleryItems = (p.gallery || []).map(url => ({ url }));

  $("delete-btn").hidden = false;
  status("");
  renderSelectedTags(); renderFeatures(); renderThumb(); renderGallery();
  renderProjectList();
  showForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("project-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("f-title").value.trim();
  const slug = slugify($("f-slug").value.trim());
  if (!title || !slug) { status("Titre et slug sont obligatoires.", true); return; }
  if (!thumbItem) { status("Une miniature est requise.", true); return; }

  // Conflit de slug avec un AUTRE projet
  if (allProjects.some(p => p.slug === slug && p.id !== editingId)) {
    status(`Le slug "${slug}" est déjà utilisé.`, true); return;
  }

  showLoading("Enregistrement…");
  try {
    // 1) Upload miniature si nouveau fichier
    let thumbnail = thumbItem.url;
    if (thumbItem.file) thumbnail = await uploadFile(thumbItem.file, slug, "thumb");

    // 2) Upload galerie (conserve l'ordre)
    const gallery = [];
    for (const g of galleryItems) {
      gallery.push(g.url ? g.url : await uploadFile(g.file, slug, "gallery"));
    }

    // 3) Construit le document
    const data = {
      slug, title,
      subtitle: $("f-subtitle").value.trim(),
      genre: $("f-genre").value.trim(),
      tags: selectedTags,
      cardBullets: linesToArray($("f-bullets").value),
      thumbnail,
      overview: $("f-overview").value.trim(),
      youtubeId: youtubeId($("f-youtube").value) || "",
      videoUrl: "",
      features: features
        .filter(f => f.heading.trim())
        .map(f => ({ heading: f.heading.trim(), text: f.text.trim(), bullets: linesToArray(f.bullets) })),
      gallery,
      featured: $("f-featured").checked,
      order: Number($("f-order").value) || 0,
      updatedAt: serverTimestamp()
    };

    // Conserve videoUrl existant (projets importés) si pas de YouTube
    const existing = allProjects.find(p => p.id === editingId);
    if (existing && existing.videoUrl && !data.youtubeId) data.videoUrl = existing.videoUrl;
    if (!existing) data.createdAt = serverTimestamp();
    else data.createdAt = existing.createdAt || serverTimestamp();

    // 4) Si Featured coché, retire le flag des autres
    if (data.featured) {
      for (const p of allProjects) {
        if (p.id !== slug && p.featured) {
          await setDoc(doc(db, "projects", p.id), { featured: false }, { merge: true });
        }
      }
    }

    // 5) Écrit le doc (slug = id). Si le slug a changé, supprime l'ancien.
    await setDoc(doc(db, "projects", slug), data, { merge: false });
    if (editingId && editingId !== slug) await deleteDoc(doc(db, "projects", editingId));

    hideLoading();
    await loadProjects();
    const saved = allProjects.find(p => p.id === slug);
    if (saved) loadIntoForm(saved);
    status("✅ Projet enregistré.");
  } catch (err) {
    hideLoading();
    console.error(err);
    status("Erreur : " + err.message, true);
  }
});

$("delete-btn").addEventListener("click", async () => {
  if (!editingId) return;
  if (!confirm(`Supprimer définitivement "${$("f-title").value}" ?`)) return;
  showLoading("Suppression…");
  try {
    await deleteDoc(doc(db, "projects", editingId));
    hideLoading();
    resetForm();
    $("project-form").hidden = true;
    $("form-placeholder").hidden = false;
    await loadProjects();
  } catch (err) {
    hideLoading();
    alert("Erreur : " + err.message);
  }
});

// ===========================================================================
//  IMPORT DES PROJETS EXISTANTS
// ===========================================================================
$("seed-btn").addEventListener("click", async () => {
  if (!confirm("Importer (ou réécrire) les 7 projets existants dans la base ?")) return;
  showLoading("Import en cours…");
  try {
    const n = await seedProjects();
    hideLoading();
    await loadProjects();
    alert(`✅ ${n} projets importés.`);
  } catch (err) {
    hideLoading();
    console.error(err);
    alert("Erreur d'import : " + err.message + "\n\nVérifie tes règles de sécurité et que OWNER_UID est bien configuré.");
  }
});

// ===========================================================================
//  UTILITAIRES
// ===========================================================================
function slugify(s) {
  return String(s).toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // accents
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function linesToArray(s) { return String(s).split("\n").map(x => x.trim()).filter(Boolean); }
function escapeText(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }
function escapeAttr(s) { return escapeText(s).replace(/"/g, "&quot;"); }
