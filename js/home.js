// ============================================================================
//  PAGE D'ACCUEIL — génère la carte "Featured" + la grille depuis Firestore
// ============================================================================
import { fetchProjects, esc } from "./data.js";
import { initScrollReveal } from "../script.js";

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
  return `<a href="project.html?p=${encodeURIComponent(p.slug)}" class="project-link">${cardInner(p)}</a>`;
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

  initScrollReveal();
}

render();
