// ============================================================================
//  PAGE PROJET — lit ?p=slug, peuple le template, monte galerie + nav + anims
// ============================================================================
import { fetchProjects, youtubeId, esc } from "./data.js";
import { initScrollReveal, initLightbox } from "../script.js";

const slug = new URLSearchParams(location.search).get("p");

function featureBlock(f) {
  const bullets = (f.bullets || []).filter(Boolean);
  return `
    <div class="feature">
      <h3>${esc(f.heading)}</h3>
      ${f.text ? `<p>${esc(f.text)}</p>` : ""}
      ${bullets.length ? `<ul>${bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    </div>`;
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
    return `<video controls style="max-width:100%; box-shadow: var(--shadow-md);">
      <source src="${esc(project.videoUrl)}" type="video/mp4">
      Your browser does not support the video tag.
    </video>`;
  }
  return "";
}

function galleryHTML(images) {
  return (images || []).map((src, i) =>
    `<a href="${esc(src)}"><img src="${esc(src)}" alt="Screenshot ${i + 1}"></a>`
  ).join("");
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

  // Vidéo
  const video = videoHTML(project);
  if (video) {
    document.getElementById("proj-video").innerHTML = video;
    document.getElementById("video-preview").hidden = false;
  }

  // Détails techniques
  const features = (project.features || []).filter(f => f && f.heading);
  if (features.length) {
    document.getElementById("proj-features").innerHTML = features.map(featureBlock).join("");
    document.getElementById("technical-details").hidden = false;
  }

  // Galerie
  if (project.gallery && project.gallery.length) {
    document.getElementById("proj-gallery").innerHTML = galleryHTML(project.gallery);
    document.getElementById("gallery").hidden = false;
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
  }

  // Comportements UI (après injection du DOM)
  initLightbox();
  initScrollReveal();
}

render();
