// ============================================================================
//  ADMIN — connexion Google sécurisée + CRUD projets (Firestore + Storage)
// ============================================================================
import { auth, db, storage, googleProvider, OWNER_UID, OWNER_CONFIGURED } from "../firebase-config.js";
import {
  onAuthStateChanged, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, updateMetadata
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
let features = [];             // [{heading, text, bullets, media}] — media: {url} | {file, preview} | null
let credits = [];              // [{role, names}] — names: "Elias - Yoan, Ena…"
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
//  DÉTAILS TECHNIQUES (features) — avec média d'illustration (GIF/image)
// ===========================================================================
$("add-feature-btn").addEventListener("click", () => { features.push({ heading: "", text: "", bullets: "", media: null }); renderFeatures(); });

function renderFeatures() {
  const wrap = $("features-container");
  wrap.innerHTML = "";
  features.forEach((f, i) => {
    const mediaSrc = f.media ? (f.media.url || f.media.preview) : "";
    const block = document.createElement("div");
    block.className = "feature-edit";
    block.innerHTML = `
      <div class="feature-edit-head">
        <input type="text" class="feat-heading" placeholder="Titre du bloc (ex: Enemy AI)" value="${escapeAttr(f.heading)}">
        <button type="button" class="btn btn-danger btn-xs feat-del">✕</button>
      </div>
      <textarea class="feat-text" rows="2" placeholder="Description…">${escapeText(f.text)}</textarea>
      <textarea class="feat-bullets" rows="3" placeholder="Un point par ligne…">${escapeText(f.bullets)}</textarea>
      <div class="feat-media-row">
        <input type="file" class="feat-media-input" accept="image/*" hidden>
        ${mediaSrc ? `
          <div class="feat-media-preview">
            <img src="${mediaSrc}" alt="">
            <button type="button" class="btn btn-danger btn-xs feat-media-del" title="Retirer le média">✕</button>
          </div>` : ""}
        <button type="button" class="btn btn-ghost btn-xs feat-media-btn">
          🖼 ${mediaSrc ? "Changer le GIF / l'image" : "Ajouter un GIF / une image d'illustration"}
        </button>
      </div>`;
    block.querySelector(".feat-heading").addEventListener("input", e => f.heading = e.target.value);
    block.querySelector(".feat-text").addEventListener("input", e => f.text = e.target.value);
    block.querySelector(".feat-bullets").addEventListener("input", e => f.bullets = e.target.value);
    block.querySelector(".feat-del").addEventListener("click", () => { features.splice(i, 1); renderFeatures(); });

    const fileInput = block.querySelector(".feat-media-input");
    block.querySelector(".feat-media-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      if (!fileInput.files[0]) return;
      f.media = { file: fileInput.files[0], preview: URL.createObjectURL(fileInput.files[0]) };
      renderFeatures();
    });
    block.querySelector(".feat-media-del")?.addEventListener("click", () => { f.media = null; renderFeatures(); });
    wrap.appendChild(block);
  });
}

// ===========================================================================
//  ÉQUIPE & CRÉDITS — un bloc par rôle, noms séparés par " - " ou ","
// ===========================================================================
$("add-credit-btn").addEventListener("click", () => { credits.push({ role: "", names: "" }); renderCredits(); });

function renderCredits() {
  const wrap = $("credits-container");
  wrap.innerHTML = "";
  credits.forEach((c, i) => {
    const block = document.createElement("div");
    block.className = "feature-edit";
    block.innerHTML = `
      <div class="feature-edit-head">
        <input type="text" class="credit-role-input" placeholder="Rôle (ex: Game design & programming)" value="${escapeAttr(c.role)}">
        <button type="button" class="btn btn-danger btn-xs credit-del">✕</button>
      </div>
      <input type="text" class="credit-names-input" placeholder="Noms (ex: Elias OSBORN SALINAS - Yoan TSITIONIS)" value="${escapeAttr(c.names)}">`;
    block.querySelector(".credit-role-input").addEventListener("input", e => c.role = e.target.value);
    block.querySelector(".credit-names-input").addEventListener("input", e => c.names = e.target.value);
    block.querySelector(".credit-del").addEventListener("click", () => { credits.splice(i, 1); renderCredits(); });
    wrap.appendChild(block);
  });
}

// ===========================================================================
//  UPLOAD IMAGES (miniature + galerie) — preview immédiat, upload à la sauvegarde
// ===========================================================================
function setupDropzone(dropId, inputId, onFiles, multiple, acceptPrefix = "image/") {
  const drop = $(dropId), input = $(inputId);
  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { onFiles([...input.files]); input.value = ""; });
  ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("dragover"); }));
  drop.addEventListener("drop", e => {
    const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith(acceptPrefix));
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

// Compresse/redimensionne une image (max 1600px, WebP) AVANT l'upload.
// Renvoie l'original si le résultat n'est pas plus léger ou si ce n'est pas une image compressible.
async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale); height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const blob = await new Promise(res => canvas.toBlob(res, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;   // pas d'amélioration → on garde l'original
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch (e) {
    console.warn("Compression ignorée :", e);
    return file;
  }
}

// Upload générique vers Storage : dossier libre (slug d'un projet, ou "settings").
// `metadata` optionnel (ex: forcer l'affichage inline d'un PDF).
async function uploadFile(file, folder, kind, metadata) {
  const toUpload = await compressImage(file);
  const safe = toUpload.name.replace(/[^\w.\-]/g, "_");
  const r = ref(storage, `${folder}/${kind}_${Date.now()}_${safe}`);
  await uploadBytes(r, toUpload, metadata);
  return getDownloadURL(r);
}

// ===========================================================================
//  FORMULAIRE : nouveau / charger / collecter / enregistrer / supprimer
// ===========================================================================
function showForm() { $("settings-form").hidden = true; $("project-form").hidden = false; $("form-placeholder").hidden = true; }

function resetForm() {
  editingId = null;
  selectedTags = []; features = []; credits = []; thumbItem = null; galleryItems = [];
  $("project-form").reset();
  $("f-category").value = "school";
  $("form-title").textContent = "Nouveau projet";
  $("delete-btn").hidden = true;
  status("");
  renderSelectedTags(); renderFeatures(); renderCredits(); renderThumb(); renderGallery();
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
  $("f-category").value = p.category === "perso" ? "perso" : "school";
  $("f-jam").value = p.jam || "";
  $("f-bullets").value = (p.cardBullets || []).join("\n");
  $("f-overview").value = p.overview || "";
  $("f-youtube").value = p.youtubeId || "";
  $("f-itch").value = p.itchUrl || "";
  $("f-steam").value = p.steamUrl || "";
  $("f-featured").checked = !!p.featured;
  $("f-order").value = p.order ?? 0;

  selectedTags = (p.tags || []).map(t => ({ label: t.label, type: t.type }));
  features = (p.features || []).map(f => ({
    heading: f.heading || "", text: f.text || "",
    bullets: (f.bullets || []).join("\n"),
    media: f.media ? { url: f.media } : null
  }));
  credits = (p.credits || []).map(c => ({ role: c.role || "", names: c.names || "" }));
  thumbItem = p.thumbnail ? { url: p.thumbnail } : null;
  galleryItems = (p.gallery || []).map(url => ({ url }));

  $("delete-btn").hidden = false;
  status("");
  renderSelectedTags(); renderFeatures(); renderCredits(); renderThumb(); renderGallery();
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

    // 3) Upload des médias de features (GIF/images d'illustration)
    const cleanFeatures = [];
    for (const f of features) {
      if (!f.heading.trim()) continue;
      let media = "";
      if (f.media) media = f.media.url || await uploadFile(f.media.file, slug, "feature");
      cleanFeatures.push({ heading: f.heading.trim(), text: f.text.trim(), bullets: linesToArray(f.bullets), media });
    }

    // 4) Construit le document
    const data = {
      slug, title,
      subtitle: $("f-subtitle").value.trim(),
      genre: $("f-genre").value.trim(),
      category: $("f-category").value === "perso" ? "perso" : "school",
      jam: $("f-jam").value.trim(),
      tags: selectedTags,
      cardBullets: linesToArray($("f-bullets").value),
      thumbnail,
      overview: $("f-overview").value.trim(),
      youtubeId: youtubeId($("f-youtube").value) || "",
      videoUrl: "",
      itchUrl: $("f-itch").value.trim(),
      steamUrl: $("f-steam").value.trim(),
      credits: credits
        .filter(c => c.role.trim() || c.names.trim())
        .map(c => ({ role: c.role.trim(), names: c.names.trim() })),
      features: cleanFeatures,
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

    // 5) Si Featured coché, retire le flag des autres
    if (data.featured) {
      for (const p of allProjects) {
        if (p.id !== slug && p.featured) {
          await setDoc(doc(db, "projects", p.id), { featured: false }, { merge: true });
        }
      }
    }

    // 6) Écrit le doc (slug = id). Si le slug a changé, supprime l'ancien.
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
//  RÉGLAGES DU SITE (contact / CV)
// ===========================================================================
let cvItem = null;       // {url} | {file} | null
let education = [];       // [{title, place, period, description}]

$("settings-btn").addEventListener("click", openSettings);
$("add-edu-btn").addEventListener("click", () => { education.push({ title: "", place: "", period: "", description: "" }); renderEdu(); });

function renderEdu() {
  const wrap = $("edu-container");
  wrap.innerHTML = "";
  education.forEach((e, i) => {
    const block = document.createElement("div");
    block.className = "feature-edit";
    block.innerHTML = `
      <div class="feature-edit-head">
        <input type="text" class="edu-title" placeholder="Diplôme / poste (ex: Master Game Programming)" value="${escapeAttr(e.title)}">
        <button type="button" class="btn btn-danger btn-xs edu-del">✕</button>
      </div>
      <div class="form-grid">
        <input type="text" class="edu-place" placeholder="École / entreprise" value="${escapeAttr(e.place)}">
        <input type="text" class="edu-period" placeholder="Période (ex: 2023 – 2025)" value="${escapeAttr(e.period)}">
      </div>
      <textarea class="edu-desc" rows="2" placeholder="Description (optionnel)">${escapeText(e.description)}</textarea>`;
    block.querySelector(".edu-title").addEventListener("input", ev => e.title = ev.target.value);
    block.querySelector(".edu-place").addEventListener("input", ev => e.place = ev.target.value);
    block.querySelector(".edu-period").addEventListener("input", ev => e.period = ev.target.value);
    block.querySelector(".edu-desc").addEventListener("input", ev => e.description = ev.target.value);
    block.querySelector(".edu-del").addEventListener("click", () => { education.splice(i, 1); renderEdu(); });
    wrap.appendChild(block);
  });
}
$("settings-cancel").addEventListener("click", () => {
  $("settings-form").hidden = true;
  $("form-placeholder").hidden = false;
});

async function openSettings() {
  $("project-form").hidden = true;
  $("form-placeholder").hidden = true;
  $("settings-form").hidden = false;
  $("settings-status").textContent = "";
  cvItem = null;
  education = [];
  ["s-email", "s-github", "s-linkedin", "s-itch"].forEach(id => { $(id).value = ""; });
  $("cv-current").textContent = "";
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    const s = snap.exists() ? snap.data() : {};
    $("s-email").value = s.email || "";
    $("s-github").value = s.github || "";
    $("s-linkedin").value = s.linkedin || "";
    $("s-itch").value = s.itch || "";
    if (s.cvUrl) { cvItem = { url: s.cvUrl }; renderCv(); }
    education = (s.education || []).map(e => ({ title: e.title || "", place: e.place || "", period: e.period || "", description: e.description || "" }));
  } catch (err) { console.error(err); }
  renderEdu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCv() {
  const el = $("cv-current");
  if (cvItem && cvItem.url) el.innerHTML = `CV actuel : <a href="${cvItem.url}" target="_blank" rel="noopener" style="color:var(--accent)">voir le PDF</a>`;
  else if (cvItem && cvItem.file) el.textContent = `Nouveau fichier prêt : ${cvItem.file.name}`;
  else el.textContent = "";
}

setupDropzone("cv-drop", "cv-input", (files) => {
  if (!files[0]) return;
  if (files[0].type !== "application/pdf") { $("settings-status").textContent = "Le CV doit être un PDF."; $("settings-status").classList.add("is-error"); return; }
  cvItem = { file: files[0] };
  $("settings-status").textContent = "";
  renderCv();
}, false, "application/pdf");

$("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showLoading("Enregistrement des réglages…");
  try {
    // Le CV doit être servi "inline" (sinon le navigateur le télécharge au lieu de l'afficher).
    const PDF_META = { contentType: "application/pdf", contentDisposition: "inline" };
    let cvUrl = cvItem && cvItem.url ? cvItem.url : "";
    if (cvItem && cvItem.file) {
      cvUrl = await uploadFile(cvItem.file, "settings", "cv", PDF_META);
    } else if (cvUrl) {
      // Répare un CV déjà uploadé (force l'affichage inline) — sans re-upload.
      try { await updateMetadata(ref(storage, cvUrl), PDF_META); } catch (e) { console.warn("MAJ métadonnées CV ignorée :", e); }
    }
    await setDoc(doc(db, "settings", "site"), {
      email: $("s-email").value.trim(),
      github: $("s-github").value.trim(),
      linkedin: $("s-linkedin").value.trim(),
      itch: $("s-itch").value.trim(),
      cvUrl,
      education: education
        .filter(e => e.title.trim())
        .map(e => ({ title: e.title.trim(), place: e.place.trim(), period: e.period.trim(), description: e.description.trim() })),
      updatedAt: serverTimestamp()
    }, { merge: true });
    hideLoading();
    if (cvUrl) { cvItem = { url: cvUrl }; renderCv(); }
    const st = $("settings-status");
    st.textContent = "✅ Réglages enregistrés."; st.classList.remove("is-error");
  } catch (err) {
    hideLoading();
    console.error(err);
    const st = $("settings-status");
    st.textContent = "Erreur : " + err.message + " — as-tu mis à jour tes règles Firestore pour /settings ? (voir SETUP_FIREBASE.md §8)";
    st.classList.add("is-error");
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
