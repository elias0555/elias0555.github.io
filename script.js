// ============================================================================
//  COMPORTEMENTS UI (module) — à appeler APRÈS l'injection du contenu dynamique
//  Exporte : initScrollReveal(), initLightbox()
//  (La navigation Prev/Next est désormais générée par js/project-page.js)
// ============================================================================

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
export function initLightbox() {
  const galleryLinks = document.querySelectorAll('.project-gallery a');
  if (galleryLinks.length === 0) return;
  if (document.getElementById('lightbox')) return; // déjà initialisé

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

  const resolveSrc = (link) => {
    let src = link.getAttribute('href');
    if (src && src.startsWith('#')) {
      const imgInside = link.querySelector('img');
      if (imgInside) src = imgInside.src;
    }
    return src;
  };

  // Génère les miniatures
  galleryLinks.forEach((link, index) => {
    const thumb = document.createElement('img');
    thumb.src = resolveSrc(link);
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
  galleryLinks.forEach(link => { const im = new Image(); im.src = resolveSrc(link); });

  // Ouverture
  galleryLinks.forEach((link, index) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      lightbox.classList.add('active');
      updateImage(index);
    });
  });

  // Fermeture
  document.querySelector('.lightbox-close').addEventListener('click', () => {
    lightbox.classList.remove('active');
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('active');
  });

  const updateImage = (index) => {
    if (index < 0) index = galleryLinks.length - 1;
    if (index >= galleryLinks.length) index = 0;
    currentImgIndex = index;

    // Échange immédiat (les images sont préchargées → instantané)
    lightboxImg.src = resolveSrc(galleryLinks[index]);

    // Petit "pop" non bloquant (relance l'animation à chaque switch)
    lightboxImg.classList.remove('swap');
    void lightboxImg.offsetWidth;            // force un reflow
    lightboxImg.classList.add('swap');

    const originalImg = galleryLinks[index].querySelector('img');
    captionText.textContent = originalImg ? originalImg.alt : "";

    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    thumbContainer.children[index].classList.add('active');
    thumbContainer.children[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
}
