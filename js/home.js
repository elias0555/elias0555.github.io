// ============================================================================
//  PAGE D'ACCUEIL — génère la carte "Featured" + la grille depuis Firestore
// ============================================================================
import { fetchProjects, fetchSettings, esc } from "./data.js";
import { initScrollReveal, initBackToTop } from "../script.js";

function tagSpan(tag) {
  const type = esc(tag.type || "tool-skill");
  return `<span class="${type}">${esc(tag.label)}</span>`;
}

function cardInner(p) {
  return `
    <div class="project">
      <img src="${esc(p.thumbnail)}" alt="${esc(p.title)}">
      <div class="project-content">
        <h3>${esc(p.title)}</h3>
        <div>${(p.tags || []).map(tagSpan).join("")}</div>
        <p>${esc(p.genre)}</p>
        <ul>${(p.cardBullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>
    </div>`;
}

function cardLink(p) {
  const tagList = (p.tags || []).map(t => t.label).join("|");
  return `<a href="project.html?p=${encodeURIComponent(p.slug)}" class="project-link" data-tags="${esc(tagList)}">${cardInner(p)}</a>`;
}

// Barre de filtres par techno (filtre la grille, côté client = instantané)
function buildFilters(gridProjects) {
  const el = document.getElementById("project-filters");
  if (!el) return;
  const tags = [];
  gridProjects.forEach(p => (p.tags || []).forEach(t => { if (!tags.includes(t.label)) tags.push(t.label); }));
  if (tags.length === 0) { el.innerHTML = ""; return; }

  el.innerHTML =
    `<button class="filter-chip is-active" data-filter="*">Tous</button>` +
    tags.map(t => `<button class="filter-chip" data-filter="${esc(t)}">${esc(t)}</button>`).join("");

  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    el.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    const f = btn.dataset.filter;
    document.querySelectorAll("#project-grid .project-link").forEach(card => {
      const cardTags = (card.dataset.tags || "").split("|");
      card.style.display = (f === "*" || cardTags.includes(f)) ? "" : "none";
    });
  });
}

// Récupère les réglages une seule fois, puis rend parcours + CV + contact
async function renderSiteExtras() {
  let s = {};
  try { s = await fetchSettings(); } catch (err) { console.error(err); }
  renderResume(s);
  renderContact(s);
}

// Section Resume : timeline de formation + aperçu du CV
function renderResume(s) {
  const timeline = document.getElementById("resume-timeline");
  const cv = document.getElementById("resume-cv");

  if (timeline) {
    const edu = s.education || [];
    timeline.innerHTML = edu.length
      ? edu.map(e => `
        <div class="timeline-item">
          ${e.period ? `<div class="timeline-period">${esc(e.period)}</div>` : ""}
          <h4 class="timeline-title">${esc(e.title)}</h4>
          ${e.place ? `<span class="timeline-place">${esc(e.place)}</span>` : ""}
          ${e.description ? `<p>${esc(e.description)}</p>` : ""}
        </div>`).join("")
      : `<p class="resume-empty">Ajoute ta formation depuis l'admin → « ⚙ Réglages du site ».</p>`;
  }

  if (cv) {
    cv.innerHTML = s.cvUrl
      ? `<iframe class="cv-frame" src="${esc(s.cvUrl)}#toolbar=0&navpanes=0&view=FitH" title="CV" loading="lazy"></iframe>
         <a class="contact-btn cv" href="${esc(s.cvUrl)}" target="_blank" rel="noopener">⬇ Télécharger le CV</a>`
      : `<p class="resume-empty">Ajoute ton CV (PDF) depuis l'admin → « ⚙ Réglages du site ».</p>`;
  }
}

// Section contact (liens + CV) depuis les réglages du site
function renderContact(s) {
  const el = document.getElementById("contact-links");
  if (!el) return;

  const links = [];
  if (s.email)    links.push(`<a class="contact-btn" href="mailto:${esc(s.email)}">✉ Email</a>`);
  if (s.github)   links.push(`<a class="contact-btn" href="${esc(s.github)}" target="_blank" rel="noopener">GitHub</a>`);
  if (s.linkedin) links.push(`<a class="contact-btn" href="${esc(s.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
  if (s.itch)     links.push(`<a class="contact-btn" href="${esc(s.itch)}" target="_blank" rel="noopener">itch.io</a>`);
  if (s.cvUrl)    links.push(`<a class="contact-btn cv" href="${esc(s.cvUrl)}" target="_blank" rel="noopener">⬇ Télécharger mon CV</a>`);

  el.innerHTML = links.length
    ? links.join("")
    : `<p style="color:var(--text-muted)">Ajoute tes liens depuis l'admin → « ⚙ Réglages du site ».</p>`;
}

async function render() {
  const featuredEl = document.getElementById("featured-container");
  const gridEl = document.getElementById("project-grid");

  let projects;
  try {
    projects = await fetchProjects();
  } catch (err) {
    console.error(err);
    if (gridEl) gridEl.innerHTML = `<p style="color:var(--secondary-accent)">Impossible de charger les projets. Vérifie la configuration Firebase.</p>`;
    return;
  }

  const featured = projects.find(p => p.featured) || projects[0];
  const others = projects.filter(p => p !== featured);

  if (featuredEl) {
    featuredEl.innerHTML = featured ? cardLink(featured) : "";
  }
  if (gridEl) {
    gridEl.innerHTML = others.map(cardLink).join("");
  }

  buildFilters(others);
  initScrollReveal();
}

render();
renderSiteExtras();
initBackToTop();
