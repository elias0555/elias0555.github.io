// ============================================================================
//  PAGE D'ACCUEIL — Featured + projets groupés (Perso / Scolaire) + filtres
// ============================================================================
import { fetchProjects, fetchSettings, esc } from "./data.js";
import { initScrollReveal, initBackToTop } from "../script.js";

// Catégorie par défaut : les anciens projets (sans champ category) sont scolaires
const projCategory = (p) => (p.category === "perso" ? "perso" : "school");

function tagSpan(tag) {
  const type = esc(tag.type || "tool-skill");
  return `<span class="${type}">${esc(tag.label)}</span>`;
}

function cardInner(p) {
  const jam = p.jam ? `<span class="jam-badge" title="Game jam project">⚑ ${esc(p.jam)}</span>` : "";
  return `
    <div class="project">
      ${jam}
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
  return `<a href="project.html?p=${encodeURIComponent(p.slug)}" class="project-link"
             data-tags="${esc(tagList)}" data-category="${projCategory(p)}" data-jam="${p.jam ? "1" : ""}">${cardInner(p)}</a>`;
}

// ---------------------------------------------------------------------------
//  FILTRES — catégorie (Tous / Perso / Scolaire / Jam) × techno, combinés
// ---------------------------------------------------------------------------
const filterState = { category: "*", tag: "*" };

function applyFilters() {
  const { category, tag } = filterState;
  document.querySelectorAll(".project-group .project-link").forEach(card => {
    const okCat =
      category === "*" ||
      (category === "jam" ? card.dataset.jam === "1" : card.dataset.category === category);
    const okTag = tag === "*" || (card.dataset.tags || "").split("|").includes(tag);
    card.style.display = (okCat && okTag) ? "" : "none";
  });

  // Masque un groupe entier s'il ne reste aucune carte visible dedans
  let anyVisible = false;
  document.querySelectorAll(".project-group").forEach(group => {
    const grid = group.querySelector(".project-grid");
    const has = [...grid.querySelectorAll(".project-link")].some(c => c.style.display !== "none");
    group.hidden = !has || grid.children.length === 0;
    if (has) anyVisible = true;
  });
  const empty = document.getElementById("projects-empty");
  if (empty) empty.hidden = anyVisible;
}

function chipBar(el, chips, onPick) {
  el.innerHTML = chips
    .map((c, i) => `<button class="filter-chip${i === 0 ? " is-active" : ""}" data-filter="${esc(c.value)}">${esc(c.label)}</button>`)
    .join("");
  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    el.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    onPick(btn.dataset.filter);
  });
}

function buildCategoryFilters(gridProjects) {
  const el = document.getElementById("category-filters");
  if (!el) return;
  const hasPerso = gridProjects.some(p => projCategory(p) === "perso");
  const hasSchool = gridProjects.some(p => projCategory(p) === "school");
  const hasJam = gridProjects.some(p => p.jam);

  const chips = [{ value: "*", label: "All" }];
  if (hasPerso) chips.push({ value: "perso", label: "Personal" });
  if (hasSchool) chips.push({ value: "school", label: "School" });
  if (hasJam) chips.push({ value: "jam", label: "⚑ Game Jam" });

  // Pas la peine d'afficher la barre s'il n'y a rien à distinguer
  if (chips.length <= 2) { el.innerHTML = ""; return; }
  chipBar(el, chips, (f) => { filterState.category = f; applyFilters(); });
}

function buildTagFilters(gridProjects) {
  const el = document.getElementById("project-filters");
  if (!el) return;
  const tags = [];
  gridProjects.forEach(p => (p.tags || []).forEach(t => { if (!tags.includes(t.label)) tags.push(t.label); }));
  if (tags.length === 0) { el.innerHTML = ""; return; }
  chipBar(el,
    [{ value: "*", label: "All techs" }, ...tags.map(t => ({ value: t, label: t }))],
    (f) => { filterState.tag = f; applyFilters(); });
}

// ---------------------------------------------------------------------------
//  RÉGLAGES DU SITE — resume + contact
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
//  RENDU PRINCIPAL
// ---------------------------------------------------------------------------
async function render() {
  const featuredEl = document.getElementById("featured-container");
  const gridPerso = document.getElementById("grid-perso");
  const gridSchool = document.getElementById("grid-school");

  let projects;
  try {
    projects = await fetchProjects();
  } catch (err) {
    console.error(err);
    const empty = document.getElementById("projects-empty");
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `<span style="color:var(--secondary-accent)">Impossible de charger les projets. Vérifie la configuration Firebase.</span>`;
    }
    return;
  }

  const featured = projects.find(p => p.featured) || projects[0];
  const others = projects.filter(p => p !== featured);

  if (featuredEl) {
    featuredEl.innerHTML = featured
      ? `<h3 class="group-title featured-title">★ Featured</h3>${cardLink(featured)}`
      : "";
  }

  const perso = others.filter(p => projCategory(p) === "perso");
  const school = others.filter(p => projCategory(p) === "school");
  if (gridPerso) {
    gridPerso.innerHTML = perso.map(cardLink).join("");
    document.getElementById("group-perso").hidden = perso.length === 0;
  }
  if (gridSchool) {
    gridSchool.innerHTML = school.map(cardLink).join("");
    document.getElementById("group-school").hidden = school.length === 0;
  }

  buildCategoryFilters(others);
  buildTagFilters(others);
  initScrollReveal();
}

render();
renderSiteExtras();
initBackToTop();
