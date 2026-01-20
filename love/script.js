document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    // Place your lyrics here. Use \n for new lines.
    const lyricsText = `
Sambhaal ke rakha wo phool mera tu Meri
shayari mein zaroor raha tu Jo aankhon mein
pyaari si duniya basaayi Wo duniya bhi tha tu,
wo lamha bhi tha tu Haan,
lagte hain mujhko ye kisse sataane
Deta na dil mera tujhko bhulaane Adhoore se vaade,
adhoori si raatein Ab hisse mein daakhil mere bas wo yaadein
    `;

    const typingSpeed = 80; // Base ms per character
    const jitter = 50;      // Random variation in typing speed

    // --- DOM ELEMENTS ---
    const audio = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const lyricsBox = document.getElementById('lyrics-box');
    const typingToggle = document.getElementById('typing-toggle');
    
    // --- STATE ---
    let isTypingEnabled = true;
    let typeTimer = null;
    let currentTextIndex = 0;
    let targetTextIndex = 0;
    
    // --- INITIALIZATION ---
    lyricsBox.textContent = ""; // Clear fallback text
    
    // --- AUDIO PLAYER LOGIC ---

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function togglePlay() {
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    }

    function updatePlayIcon() {
        if (audio.paused) {
            iconPlay.classList.remove('hidden');
            iconPause.classList.add('hidden');
        } else {
            iconPlay.classList.add('hidden');
            iconPause.classList.remove('hidden');
            // If playing, trigger typing loop
            if (isTypingEnabled) typeWriterLoop();
        }
    }

    // Update Time & Sync Typing
    audio.addEventListener('timeupdate', () => {
        currentTimeEl.textContent = formatTime(audio.currentTime);
        if (!isNaN(audio.duration) && audio.duration > 0) {
            // Sync Strategy: Map audio progress % to text length
            const progress = audio.currentTime / audio.duration;
            
            if (isTypingEnabled) {
                // Calculate where the text cursor SHOULD be based on song percentage
                targetTextIndex = Math.floor(progress * lyricsText.length);
                
                // Handle Seeking: If current text is way ahead or way behind, jump
                if (Math.abs(currentTextIndex - targetTextIndex) > 10) {
                     currentTextIndex = targetTextIndex;
                     lyricsBox.textContent = lyricsText.substring(0, currentTextIndex);
                }
            }
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('play', updatePlayIcon);
    audio.addEventListener('pause', updatePlayIcon);
    
    audio.addEventListener('ended', () => {
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
        currentTextIndex = lyricsText.length; // Ensure finished
        if(isTypingEnabled) lyricsBox.textContent = lyricsText;
    });

    playBtn.addEventListener('click', togglePlay);

    // --- TYPEWRITER LOGIC ---

    function typeWriterLoop() {
        // Stop if paused, disabled, or finished
        if (audio.paused || !isTypingEnabled || currentTextIndex >= lyricsText.length) {
            return; 
        }

        // Only type if we are lagging behind the target index (sync logic)
        // This prevents typing too fast if the song is slow
        if (currentTextIndex < targetTextIndex) {
            const char = lyricsText.charAt(currentTextIndex);
            lyricsBox.textContent += char;
            currentTextIndex++;
            
            // Scroll to bottom if lyrics get long
            lyricsBox.scrollTop = lyricsBox.scrollHeight;
        }

        // Randomized delay for natural feel
        const delay = typingSpeed + Math.random() * jitter;
        typeTimer = setTimeout(typeWriterLoop, delay);
    }

    // Toggle Switch Handler
    typingToggle.addEventListener('change', (e) => {
        isTypingEnabled = e.target.checked;
        if (isTypingEnabled) {
            // Reset to current sync point
            lyricsBox.textContent = lyricsText.substring(0, currentTextIndex);
            if (!audio.paused) typeWriterLoop();
        } else {
            clearTimeout(typeTimer);
            lyricsBox.textContent = lyricsText; // Show full text immediately
        }
    });

    // Visibility API: Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && !audio.paused) {
            audio.pause();
        }
    });

    // Keyboard Support
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !lightbox.classList.contains('active')) {
            e.preventDefault(); // Prevent scroll
            togglePlay();
        }
    });

    // --- LIGHTBOX GALLERY LOGIC ---
    
    const galleryItems = document.querySelectorAll('.gallery-item img');
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lb-img');
    const lbCaption = document.getElementById('lb-caption');
    const lbClose = document.getElementById('lb-close');
    const lbPrev = document.getElementById('lb-prev');
    const lbNext = document.getElementById('lb-next');
    
    let currentGalleryIndex = 0;

    function openLightbox(index) {
        currentGalleryIndex = index;
        updateLightboxContent();
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
        lbImg.focus(); // Move focus to modal
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function updateLightboxContent() {
        const img = galleryItems[currentGalleryIndex];
        const fullSrc = img.getAttribute('data-full');
        const captionText = img.nextElementSibling.textContent;
        
        // Show low res first while high res loads (visual placeholder)
        lbImg.src = img.src; 
        
        // Load high res
        const highResLoader = new Image();
        highResLoader.src = fullSrc;
        highResLoader.onload = () => { lbImg.src = fullSrc; };

        lbCaption.textContent = captionText;

        // Preload neighbors
        preloadImage(currentGalleryIndex + 1);
        preloadImage(currentGalleryIndex - 1);
    }

    function preloadImage(index) {
        if (index >= 0 && index < galleryItems.length) {
            const src = galleryItems[index].getAttribute('data-full');
            const preload = new Image();
            preload.src = src;
        }
    }

    function nextImage() {
        currentGalleryIndex = (currentGalleryIndex + 1) % galleryItems.length;
        updateLightboxContent();
    }

    function prevImage() {
        currentGalleryIndex = (currentGalleryIndex - 1 + galleryItems.length) % galleryItems.length;
        updateLightboxContent();
    }

    // Event Listeners for Gallery
    galleryItems.forEach((img, index) => {
        img.closest('.gallery-item').addEventListener('click', () => openLightbox(index));
    });

    lbClose.addEventListener('click', closeLightbox);
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
    
    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Keyboard Nav for Lightbox
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });

    // Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) nextImage(); // Swipe Left
        if (touchEndX > touchStartX + 50) prevImage(); // Swipe Right
    }

});