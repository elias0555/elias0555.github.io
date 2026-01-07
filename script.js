document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const projects = [
        { title: "Blossom Anomaly", url: "blossomanomaly.html" },
        { title: "ShmupMarine",     url: "shmupmarine.html" },
        { title: "Tamashi no Hashi",url: "tamashi_no_hashi.html" },
        { title: "Just Stop!",      url: "just_stop.html" },
        { title: "Echoes Below",    url: "echoes_below.html" },
        { title: "Horrorush",       url: "horrorush.html" },
        { title: "Slice Dungeon",   url: "slicedugeon.html" }
    ];

    // --- 1. SETUP PROJECT NAVIGATION (PREV / NEXT) ---
    const currentPath = window.location.pathname.split("/").pop(); // Get filename
    const currentIndex = projects.findIndex(p => p.url === currentPath);

    if (currentIndex !== -1) {
        // Find Prev and Next indices (looping)
        const prevIndex = (currentIndex - 1 + projects.length) % projects.length;
        const nextIndex = (currentIndex + 1) % projects.length;

        const prevProject = projects[prevIndex];
        const nextProject = projects[nextIndex];

        // Create Container
        const navContainer = document.createElement('div');
        navContainer.id = "project-nav-container";
        navContainer.className = "fade-in-section"; // Add animation class

        // HTML Content
        navContainer.innerHTML = `
            <a href="${prevProject.url}" class="nav-card prev">
                <span class="nav-arrow">&larr;</span>
                <div class="nav-content">
                    <span>Previous Project</span>
                    <h4>${prevProject.title}</h4>
                </div>
            </a>
            <a href="${nextProject.url}" class="nav-card next">
                <div class="nav-content">
                    <span>Next Project</span>
                    <h4>${nextProject.title}</h4>
                </div>
                <span class="nav-arrow">&rarr;</span>
            </a>
        `;

        // Insert before Footer
        const footer = document.querySelector('footer');
        if (footer) {
            footer.parentNode.insertBefore(navContainer, footer);
        }
    }


    // --- 2. SCROLL ANIMATIONS ---
    const elementsToReveal = document.querySelectorAll('section, .project, .feature, .project-gallery a, header h1, header p, #project-nav-container');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    elementsToReveal.forEach(el => {
        el.classList.add('fade-in-section');
        revealObserver.observe(el);
    });


    // --- 3. JUICY LIGHTBOX 2.0 (Dynamic Generation) ---
    const galleryLinks = document.querySelectorAll('.project-gallery a');
    
    if (galleryLinks.length > 0) {
        // Create Lightbox DOM dynamically (Removes need for HTML editing)
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

        // Generate Thumbnails
        galleryLinks.forEach((link, index) => {
            let src = link.getAttribute('href');
            // Fix for anchor links in Slice Dungeon
            if(src.startsWith('#')) {
                const imgInside = link.querySelector('img');
                if(imgInside) src = imgInside.src;
            }

            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.className = 'thumb';
            thumb.dataset.index = index;
            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                updateImage(index);
            });
            thumbContainer.appendChild(thumb);
        });

        // Open Lightbox
        galleryLinks.forEach((link, index) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                lightbox.classList.add('active');
                updateImage(index);
            });
        });

        // Close Lightbox
        document.querySelector('.lightbox-close').addEventListener('click', () => {
            lightbox.classList.remove('active');
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.classList.remove('active');
        });

        // Navigation Functions
        const updateImage = (index) => {
            if (index < 0) index = galleryLinks.length - 1;
            if (index >= galleryLinks.length) index = 0;
            currentImgIndex = index;

            // Get source
            let src = galleryLinks[index].getAttribute('href');
            if(src.startsWith('#')) {
                const imgInside = galleryLinks[index].querySelector('img');
                if(imgInside) src = imgInside.src;
            }

            // Animation: Fade out slightly, swap, fade in
            lightboxImg.style.opacity = 0.5;
            lightboxImg.style.transform = "scale(0.95)";
            
            setTimeout(() => {
                lightboxImg.src = src;
                lightboxImg.style.opacity = 1;
                lightboxImg.style.transform = "scale(1)";
                
                // Update Caption (if alt text exists)
                const originalImg = galleryLinks[index].querySelector('img');
                captionText.textContent = originalImg ? originalImg.alt : "";

                // Update Thumbnails
                document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                thumbContainer.children[index].classList.add('active');
                thumbContainer.children[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            }, 200);
        };

        document.getElementById('prev-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            updateImage(currentImgIndex - 1);
        });

        document.getElementById('next-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            updateImage(currentImgIndex + 1);
        });

        // Keyboard Support
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') lightbox.classList.remove('active');
            if (e.key === 'ArrowLeft') updateImage(currentImgIndex - 1);
            if (e.key === 'ArrowRight') updateImage(currentImgIndex + 1);
        });
    }
});