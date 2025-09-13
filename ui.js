export function bindEvents(app) {
    document.getElementById('load-youtube').addEventListener('click', () => {
        const url = document.getElementById('youtube-url').value;
        if (url) app.loadYouTubeVideo(url);
    });

    document.getElementById('video-upload').addEventListener('change', (e) => {
        if (e.target.files[0]) app.loadUploadedVideo(e.target.files[0]);
    });

    document.getElementById('trigger-comment').addEventListener('click', () => {
        app.generateComment();
    });

    document.getElementById('auto-mode').addEventListener('click', (e) => {
        app.toggleAutoMode(e.target);
    });

    document.getElementById('mute-voices').addEventListener('click', (e) => {
        app.toggleVoices(e.target);
    });

    if (app.apiKeyMissing) {
        const voicesButton = document.getElementById('mute-voices');
        if (voicesButton) {
            voicesButton.textContent = 'Voices (Disabled - API Key Needed)';
            voicesButton.disabled = true;
        }
    }

    document.getElementById('download-log').addEventListener('click', () => {
        app.downloadConversation();
    });

    document.getElementById('clear-session').addEventListener('click', () => {
        app.clearSession();
    });

    const musicVideoElement = document.getElementById('music-video');
    if (musicVideoElement) {
        musicVideoElement.addEventListener('loadedmetadata', () => {
            app.onVideoLoaded();
        });
        musicVideoElement.addEventListener('pause', () => app.handleVideoPause());
        musicVideoElement.addEventListener('play', () => app.handleVideoPlay());
    }

    const bgSelectorContainer = document.getElementById('background-selector-container');
    if (bgSelectorContainer) {
        bgSelectorContainer.innerHTML = '';
        app.backgrounds.forEach(bg => {
            const button = document.createElement('button');
            button.textContent = bg.name;
            button.dataset.bg = bg.url;
            button.addEventListener('click', () => {
                app.setBackground(bg.url);
                updateBackgroundButtons(bg.url);
            });
            bgSelectorContainer.appendChild(button);
        });
    }
}

export function showSpeechBubble(character, text) {
    const bubbleId = character === 'butthead' ? 'butthead-bubble' : 'beavis-bubble';
    const bubble = document.getElementById(bubbleId);
    const textEl = bubble.querySelector('.bubble-text');

    document.querySelectorAll('.speech-bubble').forEach(b => b.classList.remove('show'));

    textEl.textContent = text;
    bubble.classList.add('show');

    setTimeout(() => {
        bubble.classList.remove('show');
    }, 4000);
}

export function showLoading(show) {
    document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
}

export function updateStats(roastCount, praiseCount) {
    document.getElementById('roast-counter').textContent =
        `Roasts: ${roastCount} | Praise: ${praiseCount}`;
}

export function logComment(line) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, line };

    const logEl = document.getElementById('commentary-log');
    const itemEl = document.createElement('div');
    itemEl.className = 'commentary-item';
    itemEl.innerHTML = `
        <div class="commentary-timestamp">${new Date(timestamp).toLocaleTimeString()}</div>
        <div class="commentary-text">
            <span class="character-name">${line.split(':')[0]}:</span>
            ${line.split(':').slice(1).join(':').trim()}
        </div>
    `;

    logEl.appendChild(itemEl);
    logEl.scrollTop = logEl.scrollHeight;

    return logEntry;
}

export function setBackground(bgUrl) {
    const backgroundElement = document.getElementById('background');
    if (backgroundElement) {
        backgroundElement.src = bgUrl;
        localStorage.setItem('selectedBackgroundUrl', bgUrl);
    }
}

export function updateBackgroundButtons(activeBgUrl) {
   const buttons = document.querySelectorAll('.background-selection button');
   buttons.forEach(button => {
       if (button.dataset.bg === activeBgUrl) {
           button.classList.add('active-bg');
       } else {
           button.classList.remove('active-bg');
       }
   });
}

export function lowerVideoVolume() {
    const video = document.getElementById('music-video');
    if (video && !video.paused) {
        this.originalVideoVolume = video.volume;
        video.volume = Math.max(0.1, this.originalVideoVolume * 0.3);
    }
}

export function restoreVideoVolume() {
    const video = document.getElementById('music-video');
    if (video) {
        video.volume = this.originalVideoVolume;
    }
}
