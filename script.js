// ============================================================================
//  COMPORTEMENTS UI (module) — à appeler APRÈS l'injection du contenu dynamique
//  Exporte : initScrollReveal(), initLightbox(), initBackToTop()
//  (La navigation Prev/Next est désormais générée par js/project-page.js)
// ============================================================================

// --- Bouton "remonter en haut" (apparaît après un peu de scroll) ------------
export function initBackToTop() {
  if (document.getElementById('back-to-top')) return; // déjà initialisé

  const btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Remonter en haut de la page');
  btn.title = 'Remonter en haut';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 20 Q 11.2 12 12 5 M 6 11 Q 9 7 12 4.5 Q 15 7 18 11"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  document.body.appendChild(btn);

  const toggle = () => btn.classList.toggle('show', window.scrollY > 400);
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();

  // 'instant' court-circuite le scroll-behavior:smooth global → remontée immédiate
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'instant' }));
}

// --- Animations d'apparition au scroll --------------------------------------
export function initScrollReveal() {
  const elementsToReveal = document.querySelectorAll(
    'section, .project, .feature, .project-gallery a, header h1, header p, #project-nav-container'
  );
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elementsToReveal.forEach(el => {
    if (!el.classList.contains('is-visible')) el.classList.add('fade-in-section');
    revealObserver.observe(el);
  });
}

// --- Lightbox de galerie -----------------------------------------------------
// Accepte une liste de sources d'images et renvoie une fonction open(index)
// pour l'ouvrir par programme (depuis le carrousel média de la page projet).
// Rétro-compat : sans argument, scanne les liens `.project-gallery a` présents.
export function initLightbox(images) {
  const resolveSrc = (link) => {
    let src = link.getAttribute('href');
    if (src && src.startsWith('#')) {
      const imgInside = link.querySelector('img');
      if (imgInside) src = imgInside.src;
    }
    return src;
  };

  const galleryLinks = [...document.querySelectorAll('.project-gallery a')];
  const srcs = (images && images.length) ? images.slice() : galleryLinks.map(resolveSrc);
  if (srcs.length === 0) return null;
  if (document.getElementById('lightbox')) return null; // déjà initialisé

  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.innerHTML = `
    <span class="lightbox-close">&times;</span>
    <div class="lightbox-content">
      <button class="lightbox-btn" id="prev-btn">&#10094;</button>
      <img id="lightbox-img" src="" alt="Gallery Image">
      <button class="lightbox-btn" id="next-btn">&#10095;</button>
    </div>
    <div id="lightbox-caption"></div>
    <div class="lightbox-thumbnails"></div>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = document.getElementById('lightbox-img');
  const captionText = document.getElementById('lightbox-caption');
  const thumbContainer = document.querySelector('.lightbox-thumbnails');
  let currentImgIndex = 0;

  // Génère les miniatures
  srcs.forEach((src, index) => {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.className = 'thumb';
    thumb.loading = 'lazy';
    thumb.dataset.index = index;
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      updateImage(index);
    });
    thumbContainer.appendChild(thumb);
  });

  // Précharge TOUTES les images plein écran → navigation instantanée (plus de flash)
  srcs.forEach(src => { const im = new Image(); im.src = src; });

  const open = (index) => { lightbox.classList.add('active'); updateImage(index); };

  // Rétro-compat : ouvre au clic si des liens de galerie existent dans la page
  galleryLinks.forEach((link, index) => {
    link.addEventListener('click', (e) => { e.preventDefault(); open(index); });
  });

  // Fermeture
  document.querySelector('.lightbox-close').addEventListener('click', () => {
    lightbox.classList.remove('active');
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('active');
  });

  const updateImage = (index) => {
    if (index < 0) index = srcs.length - 1;
    if (index >= srcs.length) index = 0;
    currentImgIndex = index;

    // Échange immédiat (les images sont préchargées → instantané)
    lightboxImg.src = srcs[index];

    // Petit "pop" non bloquant (relance l'animation à chaque switch)
    lightboxImg.classList.remove('swap');
    void lightboxImg.offsetWidth;            // force un reflow
    lightboxImg.classList.add('swap');

    captionText.textContent = `Screenshot ${index + 1} / ${srcs.length}`;

    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    thumbContainer.children[index].classList.add('active');
    thumbContainer.children[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  document.getElementById('prev-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    updateImage(currentImgIndex - 1);
  });
  document.getElementById('next-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    updateImage(currentImgIndex + 1);
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') lightbox.classList.remove('active');
    if (e.key === 'ArrowLeft') updateImage(currentImgIndex - 1);
    if (e.key === 'ArrowRight') updateImage(currentImgIndex + 1);
  });

  return open;
}
