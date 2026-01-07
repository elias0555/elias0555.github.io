document.addEventListener('DOMContentLoaded', () => {
    
    // --- Lightbox Logic ---
    const galleryLinks = document.querySelectorAll('.project-gallery a');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    let currentIndex = 0;

    // Only run if gallery exists on page
    if (galleryLinks.length > 0 && lightbox) {
        
        // Open Lightbox
        galleryLinks.forEach((link, index) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                currentIndex = index;
                openLightbox(link.getAttribute('href')); // Assuming href links to full-res image
            });
        });

        // Close Lightbox
        closeBtn.addEventListener('click', () => {
            lightbox.classList.remove('active');
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
            }
        });

        // Navigation
        const showImage = (index) => {
            if (index < 0) index = galleryLinks.length - 1;
            if (index >= galleryLinks.length) index = 0;
            currentIndex = index;
            const newSrc = galleryLinks[currentIndex].getAttribute('href');
            lightboxImg.src = newSrc;
        };

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showImage(currentIndex - 1);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showImage(currentIndex + 1);
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') lightbox.classList.remove('active');
            if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
            if (e.key === 'ArrowRight') showImage(currentIndex + 1);
        });
    }

    function openLightbox(src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
    }
});