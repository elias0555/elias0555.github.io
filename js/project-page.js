// ============================================================================
//  PAGE PROJET — lit ?p=slug, peuple le template, monte galerie + nav + anims
// ============================================================================
import { fetchProjects, youtubeId, esc } from "./data.js";
import { initScrollReveal, initLightbox, initBackToTop } from "../script.js";

const slug = new URLSearchParams(location.search).get("p");

function tagSpan(tag) {
  const type = esc(tag.type || "tool-skill");
  return `<span class="${type}">${esc(tag.label)}</span>`;
}

function featureBlock(f) {
  const bullets = (f.bullets || []).filter(Boolean);
  // Média d'illustration (GIF ou image) affiché dans le bloc, ouvrable en grand
  const media = f.media
    ? `<a class="feature-media" href="${esc(f.media)}" target="_blank" rel="noopener">
         <img src="${esc(f.media)}" alt="${esc(f.heading)} illustration" loading="lazy">
       </a>`
    : "";
  return `
    <div class="feature${media ? " has-media" : ""}">
      <div class="feature-body">
        <h3>${esc(f.heading)}</h3>
        ${f.text ? `<p>${esc(f.text)}</p>` : ""}
        ${bullets.length ? `<ul>${bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>
      ${media}
    </div>`;
}

// Section "Team & Credits" : un rôle + la liste des personnes
// (les noms sont séparés par " - ", "," ou ";" dans l'admin)
function creditsHTML(credits) {
  return credits.map(c => {
    const names = String(c.names || "")
      .split(/\s*[,;]\s*|\s+-\s+/)
      .map(n => n.trim())
      .filter(Boolean);
    return `
      <div class="credit">
        <span class="credit-role">${esc(c.role)}</span>
        <span class="credit-names">${names.map(n => `<span class="credit-name">${esc(n)}</span>`).join("")}</span>
      </div>`;
  }).join("");
}

// Retire le lien de nav d'une section absente (évite les ancres mortes)
function dropNavLink(hash) {
  const a = document.querySelector(`header nav a[href="${hash}"]`);
  if (a) a.closest("li")?.remove();
}

function videoHTML(project) {
  const yt = youtubeId(project.youtubeId);
  if (yt) {
    return `<div class="video-embed">
      <iframe src="https://www.youtube.com/embed/${esc(yt)}"
              title="${esc(project.title)}" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen></iframe>
    </div>`;
  }
  if (project.videoUrl) {
    return `<video controls>
      <source src="${esc(project.videoUrl)}" type="video/mp4">
      Your browser does not support the video tag.
    </video>`;
  }
  return "";
}

// Carrousel média façon Steam : grande scène (vidéo ou screenshot actif) + bande
// de miniatures dessous (slider). Cliquer une miniature change la scène ; les
// flèches font défiler. Cliquer un screenshot affiché ouvre la lightbox.
function buildMediaCarousel(root, { title, videoHtml, images, fallbackImage, openLightbox }) {
  if (!root) return;

  // Items : vidéo (si dispo) en tête, puis screenshots ; sinon la vignette en secours
  const items = [];
  if (videoHtml) items.push({ kind: "video" });
  (images || []).forEach((src, i) => items.push({ kind: "image", src, index: i }));
  if (!items.length && fallbackImage) items.push({ kind: "image", src: fallbackImage, index: -1 });
  if (!items.length) return;

  // Miniature de la scène vidéo : 1er screenshot ou la vignette
  const videoThumb = (images && images[0]) || fallbackImage || "";

  root.innerHTML = `
    <div class="media-stage" id="media-stage"></div>
    ${items.length > 1 ? `
    <div class="media-strip">
      <button type="button" class="strip-arrow prev" aria-label="Précédent">&#10094;</button>
      <div class="strip-track" id="strip-track"></div>
      <button type="button" class="strip-arrow next" aria-label="Suivant">&#10095;</button>
    </div>` : ""}`;

  const stage = root.querySelector("#media-stage");
  const track = root.querySelector("#strip-track");
  let active = 0;

  const showStage = (i) => {
    active = (i + items.length) % items.length;
    const it = items[active];
    if (it.kind === "video") {
      stage.classList.remove("is-image");
      stage.innerHTML = videoHtml;
    } else {
      stage.classList.add("is-image");
      stage.innerHTML = `<img class="stage-img" src="${esc(it.src)}" alt="${esc(title)} screenshot">`;
      if (openLightbox && it.index >= 0) {
        stage.querySelector(".stage-img").addEventListener("click", () => openLightbox(it.index));
      }
    }
    if (track) {
      [...track.children].forEach((c, idx) => c.classList.toggle("active", idx === active));
      track.children[active]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  if (track) {
    track.innerHTML = items.map((it, i) => it.kind === "video"
      ? `<button type="button" class="strip-thumb is-video" data-i="${i}" aria-label="Vidéo">
           <img src="${esc(videoThumb)}" alt="" loading="lazy"><span class="play-ico" aria-hidden="true">▶</span>
         </button>`
      : `<button type="button" class="strip-thumb" data-i="${i}" aria-label="Capture ${it.index + 1}">
           <img src="${esc(it.src)}" alt="" loading="lazy">
         </button>`).join("");
    track.addEventListener("click", (e) => {
      const b = e.target.closest(".strip-thumb");
      if (b) showStage(Number(b.dataset.i));
    });
    root.querySelector(".strip-arrow.prev").addEventListener("click", () => showStage(active - 1));
    root.querySelector(".strip-arrow.next").addEventListener("click", () => showStage(active + 1));
  }

  showStage(0);
}

// Menu burger fixe en haut à gauche : au survol (ou au clic sur tactile),
// un panneau papier liste tous les projets avec leurs infos clés
function projectMenuHTML(projects, currentSlug) {
  const items = projects.map((p, i) => {
    const current = p.slug === currentSlug;
    const tags = (p.tags || [])
      .map(t => `<span class="${esc(t.type || "tool-skill")}">${esc(t.label)}</span>`)
      .join("");
    return `
      <a href="project.html?p=${encodeURIComponent(p.slug)}" style="--i:${i}"
         class="pm-item${current ? " current" : ""}" ${current ? 'aria-current="page"' : ""}>
        <img src="${esc(p.thumbnail || "")}" alt="" loading="lazy">
        <div class="pm-meta">
          <strong>${esc(p.title)}</strong>
          ${p.genre ? `<small>${esc(p.genre)}</small>` : ""}
          ${tags ? `<div class="pm-tags">${tags}</div>` : ""}
        </div>
      </a>`;
  }).join("");

  return `
    <button type="button" class="burger-btn" aria-haspopup="true" aria-expanded="false"
            aria-controls="project-menu-panel" aria-label="Tous les projets" title="Tous les projets">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 7 Q 9 5.5 12 7 T 20 7 M4 12 Q 9 10.5 12 12 T 20 12 M4 17 Q 9 15.5 12 17 T 20 17"
              fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    </button>
    <nav id="project-menu-panel" class="project-menu-panel" aria-label="Autres projets">
      <p class="pm-title">Tous les projets</p>
      ${items}
    </nav>`;
}

function initProjectMenu(projects, currentSlug) {
  const menu = document.createElement("div");
  menu.className = "project-menu";
  menu.innerHTML = projectMenuHTML(projects, currentSlug);
  document.body.appendChild(menu);

  // Le survol épingle le panneau ouvert (il ne se referme pas quand la souris
  // s'en va) ; fermeture par clic ailleurs, Échap, ou re-clic sur le bouton.
  // Sur tactile il n'y a pas de hover : le bouton ouvre/ferme le panneau.
  const btn = menu.querySelector(".burger-btn");
  const close = () => { menu.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
  menu.addEventListener("mouseenter", () => {
    menu.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  });
  btn.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

function navHTML(prev, next) {
  return `
    <a href="project.html?p=${encodeURIComponent(prev.slug)}" class="nav-card prev">
      <span class="nav-arrow">&larr;</span>
      <div class="nav-content"><span>Previous Project</span><h4>${esc(prev.title)}</h4></div>
    </a>
    <a href="project.html?p=${encodeURIComponent(next.slug)}" class="nav-card next">
      <div class="nav-content"><span>Next Project</span><h4>${esc(next.title)}</h4></div>
      <span class="nav-arrow">&rarr;</span>
    </a>`;
}

async function render() {
  if (!slug) {
    document.getElementById("proj-title").textContent = "Projet introuvable";
    return;
  }

  let projects;
  try {
    projects = await fetchProjects();
  } catch (err) {
    console.error(err);
    document.getElementById("proj-title").textContent = "Erreur de chargement";
    document.getElementById("proj-overview").textContent =
      "Impossible de contacter la base de données. Vérifie la configuration Firebase.";
    return;
  }

  const index = projects.findIndex(p => p.slug === slug);
  const project = projects[index];

  if (!project) {
    document.getElementById("proj-title").textContent = "Projet introuvable";
    document.getElementById("proj-overview").innerHTML =
      `Ce projet n'existe pas. <a href="index.html" style="color:var(--accent)">Retour à l'accueil</a>.`;
    return;
  }

  // En-tête + overview
  document.title = `${project.title} - Project Details`;
  document.getElementById("proj-title").textContent = project.title;
  document.getElementById("proj-subtitle").textContent = project.subtitle || "";
  document.getElementById("proj-overview").textContent = project.overview || "";

  // Badges méta : catégorie (Perso / Scolaire) + Game Jam
  const metaEl = document.getElementById("proj-meta");
  if (metaEl) {
    const badges = [];
    badges.push(project.category === "perso"
      ? `<span class="meta-badge perso">Personal project</span>`
      : `<span class="meta-badge school">School project</span>`);
    if (project.jam) badges.push(`<span class="meta-badge jam">⚑ ${esc(project.jam)}</span>`);
    metaEl.innerHTML = badges.join("");
  }

  // Boutons "jouer" : itch.io / Steam
  const linksEl = document.getElementById("proj-links");
  if (linksEl) {
    const links = [];
    if (project.itchUrl) {
      links.push(`<a class="play-btn itch" href="${esc(project.itchUrl)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9 h10 a4 4 0 0 1 4 4 v1 a3 3 0 0 1 -5.5 1.6 L14 14 h-4 l-1.5 1.6 A3 3 0 0 1 3 14 v-1 a4 4 0 0 1 4 -4 Z M8 11.5 v2.5 M6.8 12.8 h2.5 M15.5 11.5 h.01 M17.5 13.5 h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Play on itch.io</a>`);
    }
    if (project.steamUrl) {
      links.push(`<a class="play-btn steam" href="${esc(project.steamUrl)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="15" cy="9.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="15.5" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.8 14.2 L13.3 11.3 M4 13.5 l3.2 1.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        View on Steam</a>`);
    }
    linksEl.innerHTML = links.join("");
  }

  // Team & Credits
  const credits = (project.credits || []).filter(c => c && (c.role || c.names));
  if (credits.length) {
    document.getElementById("proj-credits").innerHTML = creditsHTML(credits);
    document.getElementById("team").hidden = false;
  } else {
    dropNavLink("#team");
  }

  // Capsule (vignette) à droite — masquée si elle ferait doublon avec le média
  const capsuleEl = document.getElementById("proj-capsule");
  const gallery = (project.gallery || []).filter(Boolean);
  const videoHtml = videoHTML(project);
  if (capsuleEl) {
    if (project.thumbnail && (videoHtml || gallery.length)) {
      capsuleEl.innerHTML = `<img src="${esc(project.thumbnail)}" alt="${esc(project.title)}">`;
    } else {
      capsuleEl.hidden = true;
    }
  }
  // Tags techno sous la description
  const tagsEl = document.getElementById("proj-tags");
  if (tagsEl) {
    const tags = project.tags || [];
    if (tags.length) tagsEl.innerHTML = tags.map(tagSpan).join("");
    else tagsEl.hidden = true;
  }
  // Carrousel média (façon Steam) : grande scène + bande de miniatures (slider).
  // La lightbox plein écran réutilise la liste des screenshots.
  const openLightbox = initLightbox(gallery);
  buildMediaCarousel(document.getElementById("proj-media"), {
    title: project.title, videoHtml, images: gallery,
    fallbackImage: project.thumbnail, openLightbox
  });

  // Détails techniques
  const features = (project.features || []).filter(f => f && f.heading);
  if (features.length) {
    document.getElementById("proj-features").innerHTML = features.map(featureBlock).join("");
    document.getElementById("technical-details").hidden = false;
  } else {
    dropNavLink("#technical-details");
  }

  // Navigation Prev/Next (en boucle)
  if (projects.length > 1) {
    const prev = projects[(index - 1 + projects.length) % projects.length];
    const next = projects[(index + 1) % projects.length];
    const navContainer = document.createElement("div");
    navContainer.id = "project-nav-container";
    navContainer.innerHTML = navHTML(prev, next);
    const footer = document.querySelector("footer");
    footer.parentNode.insertBefore(navContainer, footer);

    // Menu burger fixe : changer de projet depuis n'importe où dans la page
    initProjectMenu(projects, slug);

    // Raccourcis clavier ← / → (désactivés quand la lightbox est ouverte
    // ou qu'un champ de saisie a le focus)
    document.addEventListener("keydown", (e) => {
      const lb = document.getElementById("lightbox");
      if (lb && lb.classList.contains("active")) return;
      if (e.target.matches("input, textarea, select")) return;
      if (e.key === "ArrowLeft") location.href = `project.html?p=${encodeURIComponent(prev.slug)}`;
      if (e.key === "ArrowRight") location.href = `project.html?p=${encodeURIComponent(next.slug)}`;
    });
  }

  // Comportements UI (après injection du DOM)
  initScrollReveal();
  initBackToTop();
}

render();
