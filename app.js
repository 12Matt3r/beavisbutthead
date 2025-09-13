import { generateComment, speak } from './api.js';
import { setup3DEnvironment } from './scene.js';
import { bindEvents, showSpeechBubble, showLoading, updateStats, logComment, setBackground, updateBackgroundButtons, lowerVideoVolume, restoreVideoVolume } from './ui.js';

class BeavisAndButtHeadCommentary {
    constructor() {
        this.conversationHistory = [];
        this.conversationLog = [];
        this.autoMode = false;
        this.voicesEnabled = true;
        this.roastCount = 0;
        this.praiseCount = 0;
        this.currentVideoTitle = '';
        this.lastCommentTime = 0;
        this.originalVideoVolume = 1.0;
        this.currentAudio = null; // Track current TTS audio
        this.beavisState = 'idle'; // Initial state
        this.buttheadState = 'idle'; // Initial state
        this.beavisBaseRotation = null;
        this.buttheadBaseRotation = null;
        this.beavisBasePosition = null;
        this.buttheadBasePosition = null;

        this.isCornholioMode = false;
        this.cornholioTimeoutId = null;
        this.cornholioCommentCount = 0;
        this.cornholioMaxComments = 2; // Beavis says 2 lines as Cornholio
        this.cornholioDuration = 30000; // 30 seconds max for mode

        this.backgrounds = [
            { name: "Living Room", url: "/living-room-bg.png" },
            { name: "Outer Space", url: "/placeholder-bg-space.png" },
            { name: "Rock Stage", url: "/placeholder-bg-stage.png" }
        ];
        this.defaultBackgroundUrl = "/living-room-bg.png";

        this.videoLoadComments = [
            { butthead: "Uhuhuhuh, alright! Let's see what kind of crap this is gonna be.", beavis: "Yeah! Yeah! This better not suck!" },
            { butthead: "Huh huh. Wonder if this video is gonna be cool.", beavis: "More TV! More TV!" },
            { butthead: "Alright, new video. Try not to break the TV, Beavis.", beavis: "Heh heh. Break it! Break it!" }
        ];

        this.lastPausePlayCommentTime = 0;
        this.pausePlayCommentCooldown = 15000; // 15 seconds
        this.pauseComments = [
            { character: 'butthead', text: "Huh. Paused." },
            { character: 'beavis', text: "Hey, why'd it stop?!" },
            { character: 'butthead', text: "Uh, did you, like, do that on purpose?" }
        ];
        this.playComments = [
            { character: 'beavis', text: "Yeah! Play it!" },
            { character: 'butthead', text: "And now, like, it's playing again. Huh huh." },
            { character: 'beavis', text: "Go! Go! Go!" }
        ];
        
        // 3D Scene setup - now main scene instead of separate character scenes
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.beavisModel = null;
        this.buttheadModel = null;
        this.tvScreen = null;
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            isResizing: false,
            currentElement: null,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startLeft: 0,
            startTop: 0
        };
        
        this.init();
    }

    async init() {
        this.apiKeyMissing = false; // Initialize the flag
        if (window.APP_CONFIG.elevenLabsApiKey === 'YOUR_ELEVENLABS_API_KEY') {
            this.apiKeyMissing = true;
            console.warn(
                '%cWARNING: ElevenLabs API Key is not set!',
                'color: yellow; font-weight: bold; font-size: 16px;'
            );
            console.warn(
                'Please set your ElevenLabs API key in `config.js`.'
            );
            console.info('Voice functionality will be disabled until the API key is provided.');
            this.voicesEnabled = false;
        }

        setup3DEnvironment(this);
        bindEvents(this);
        this.setupDragAndDrop();
        this.startAutoCommentary();
        this.showWelcomeMessage();

        // Load saved background or default
        const savedBgUrl = localStorage.getItem('selectedBackgroundUrl');
        // Check if savedBgUrl is valid among the defined backgrounds
        const initialBgUrl = this.backgrounds.some(bg => bg.url === savedBgUrl) ? savedBgUrl : this.defaultBackgroundUrl;
        this.setBackground(initialBgUrl);
        this.updateBackgroundButtons(initialBgUrl);
    }


    handleVideoPause() {
        if (Date.now() - this.lastPausePlayCommentTime < this.pausePlayCommentCooldown) return;
        // Only comment if the video was actually playing (not paused at the start or already paused)
        const video = document.getElementById('music-video');
        if (video && !video.paused && video.duration > 0 && !video.ended) { // Check if it was playing
             // This check is tricky because event fires *after* pause.
             // A better check might be to see if it's not at the beginning or end.
             // For now, a simple random chance if not in cooldown.
        }
        // The above check is problematic for 'pause' event.
        // Let's assume if pause event fires, it's a valid time to comment if cooldown allows.
        // However, we should avoid commenting if the video source is not loaded yet or if it ended.
        if (video && video.readyState < 2) return; // Not enough data to play/pause meaningfully
        if (video && video.ended) return; // Don't comment if video ended and implicitly paused.
        // Also, ensure it's not a synthetic pause event when loading a new video.
        // This might be hard to distinguish perfectly. Let's rely on cooldown primarily.


        if (Math.random() < 0.3) { // 30% chance
            const comment = this.pauseComments[Math.floor(Math.random() * this.pauseComments.length)];
            this.showSpeechBubble(comment.character, comment.text);
            this.lastPausePlayCommentTime = Date.now();
        }
    }

    handleVideoPlay() {
        if (Date.now() - this.lastPausePlayCommentTime < this.pausePlayCommentCooldown) return;

        const video = document.getElementById('music-video');
        // Don't comment on initial play or if video source not ready
        if (video && video.currentTime < 1 && video.readyState >= 2) return;
        if (video && video.readyState < 2) return;


        if (Math.random() < 0.3) { // 30% chance
            const comment = this.playComments[Math.floor(Math.random() * this.playComments.length)];
            this.showSpeechBubble(comment.character, comment.text);
            this.lastPausePlayCommentTime = Date.now();
        }
    }

    setupDragAndDrop() {
        /* @tweakable minimum drag distance to start dragging */
        const minDragDistance = 5;
        
        // Make all photo assets and TV screen draggable
        const draggableElements = document.querySelectorAll('.photo-asset, #tv-screen');
        
        draggableElements.forEach(element => {
            this.makeDraggable(element);
            this.addResizeHandle(element);
        });

        // Setup drop zone for TV screen
        this.setupDropZone();

        // Global mouse events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click context menu
        
        // Click outside to deselect
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.draggable')) {
                this.deselectAll();
            }
        });
    }

    setupDropZone() {
        const tvScreen = document.getElementById('tv-screen');
        if (!tvScreen.querySelector('.drop-zone')) {
            const dropZone = document.createElement('div');
            dropZone.className = 'drop-zone';
            /* @tweakable drop zone border color when active */
            const dropZoneBorderColor = '#00ff00';
            /* @tweakable drop zone border width */
            const dropZoneBorderWidth = '3px';
            dropZone.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: ${dropZoneBorderWidth} dashed transparent;
                pointer-events: none;
                transition: border-color 0.3s ease;
            `;
            tvScreen.appendChild(dropZone);
        }
    }

    makeDraggable(element) {
        element.classList.add('draggable');
        
        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.selectElement(element);
            
            if (e.button === 0) { // Left mouse button for dragging
                this.dragState.isDragging = true;
                this.dragState.currentElement = element;
                this.dragState.startX = e.clientX;
                this.dragState.startY = e.clientY;
                
                const rect = element.getBoundingClientRect();
                this.dragState.startLeft = rect.left;
                this.dragState.startTop = rect.top;
                
                element.classList.add('dragging');
            } else if (e.button === 2) { // Right mouse button for scaling
                this.dragState.isResizing = true;
                this.dragState.currentElement = element;
                this.dragState.startX = e.clientX;
                this.dragState.startY = e.clientY;
                
                const rect = element.getBoundingClientRect();
                this.dragState.startWidth = rect.width;
                this.dragState.startHeight = rect.height;
            }
        });

        // Add wheel event for scaling
        element.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.selectElement(element);
            
            /* @tweakable wheel scaling sensitivity */
            const scaleFactor = 0.1;
            /* @tweakable minimum scale size */
            const minScale = 0.2;
            /* @tweakable maximum scale size */
            const maxScale = 3.0;
            
            const currentTransform = element.style.transform || 'scale(1)';
            const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
            let currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
            
            if (e.deltaY < 0) {
                currentScale += scaleFactor; // Zoom in
            } else {
                currentScale -= scaleFactor; // Zoom out
            }
            
            currentScale = Math.max(minScale, Math.min(maxScale, currentScale));
            element.style.transform = `scale(${currentScale})`;
        });
    }

    addResizeHandle(element) {
        // Remove resize handle since we're using right-click for scaling
        const existingHandle = element.querySelector('.resize-handle');
        if (existingHandle) {
            existingHandle.remove();
        }
    }

    handleMouseMove(e) {
        if (!this.dragState.isDragging && !this.dragState.isResizing) return;

        const element = this.dragState.currentElement;
        
        if (this.dragState.isResizing) {
            /* @tweakable minimum resize width */
            const minWidth = 30;
            /* @tweakable minimum resize height */
            const minHeight = 30;
            /* @tweakable maximum resize width */
            const maxWidth = window.innerWidth * 0.8;
            /* @tweakable maximum resize height */
            const maxHeight = window.innerHeight * 0.8;
            /* @tweakable resize aspect ratio lock (set to true to maintain aspect ratio) */
            const lockAspectRatio = true;
            
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;
            
            let newWidth = this.dragState.startWidth + deltaX;
            let newHeight = this.dragState.startHeight + deltaY;
            
            if (lockAspectRatio) {
                const aspectRatio = this.dragState.startWidth / this.dragState.startHeight;
                newHeight = newWidth / aspectRatio;
            }
            
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            
            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
            
        } else if (this.dragState.isDragging) {
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;
            
            let newLeft = this.dragState.startLeft + deltaX;
            let newTop = this.dragState.startTop + deltaY;
            
            // Apply boundary constraints
            /* @tweakable boundary padding from screen edges */
            const elementRect = element.getBoundingClientRect();

            if (element.id === 'tv-screen') {
                // Stricter boundary: keep TV fully within viewport
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - elementRect.width));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - elementRect.height));
            } else {
                // Existing boundary padding for other draggable elements
                const boundaryPadding = 20;
                const maxLeft = window.innerWidth - elementRect.width - boundaryPadding;
                const maxTop = window.innerHeight - elementRect.height - boundaryPadding;
                newLeft = Math.max(boundaryPadding, Math.min(maxLeft, newLeft));
                newTop = Math.max(boundaryPadding, Math.min(maxTop, newTop));
            }
            
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            
            // Check if over TV screen for photo assets
            if (element.classList.contains('photo-asset')) {
                const tvScreen = document.getElementById('tv-screen');
                const tvRect = tvScreen.getBoundingClientRect();
                const updatedElementRect = {
                    left: newLeft,
                    top: newTop,
                    right: newLeft + elementRect.width,
                    bottom: newTop + elementRect.height,
                    width: elementRect.width,
                    height: elementRect.height
                };
                
                const dropZone = tvScreen.querySelector('.drop-zone');
                
                if (this.isOverlapping(updatedElementRect, tvRect)) {
                    dropZone.classList.add('active');
                } else {
                    dropZone.classList.remove('active');
                }
            }
        }
    }

    handleMouseUp(e) {
        if (!this.dragState.isDragging && !this.dragState.isResizing) return;
        
        const element = this.dragState.currentElement;
        
        if (this.dragState.isDragging && element.classList.contains('photo-asset')) {
            const tvScreen = document.getElementById('tv-screen');
            const tvRect = tvScreen.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            // If dropped on TV screen, position it relative to the TV
            if (this.isOverlapping(elementRect, tvRect)) {
                /* @tweakable photo overlay z-index when dropped on TV */
                const photoOverlayZIndex = 15;
                
                const relativeX = elementRect.left - tvRect.left;
                const relativeY = elementRect.top - tvRect.top;

                const snapIncrement = 10; // Snap to nearest 10 pixels
                const snappedRelativeX = Math.round(relativeX / snapIncrement) * snapIncrement;
                const snappedRelativeY = Math.round(relativeY / snapIncrement) * snapIncrement;
                
                element.style.position = 'absolute';
                element.style.left = `${tvScreen.offsetLeft + snappedRelativeX}px`;
                element.style.top = `${tvScreen.offsetTop + snappedRelativeY}px`;
                element.style.zIndex = photoOverlayZIndex;
                
                // Scale down to fit better on screen
                /* @tweakable photo scale when dropped on TV screen */
                const tvDropScale = 0.3;
                const currentTransform = element.style.transform || '';
                const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
                element.style.transform = `scale(${currentScale * tvDropScale})`;
            }
            
            const dropZone = tvScreen.querySelector('.drop-zone');
            dropZone.classList.remove('active');
        }
        
        element.classList.remove('dragging');
        
        this.dragState.isDragging = false;
        this.dragState.isResizing = false;
        this.dragState.currentElement = null;
    }

    selectElement(element) {
        this.deselectAll();
        element.classList.add('selected');
    }

    deselectAll() {
        document.querySelectorAll('.draggable.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    isOverlapping(rect1, rect2) {
        /* @tweakable overlap threshold for drop detection */
        const overlapThreshold = 0.3;
        
        const overlapX = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
        const overlapY = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
        const overlapArea = overlapX * overlapY;
        const rect1Area = rect1.width * rect1.height;
        
        return (overlapArea / rect1Area) > overlapThreshold;
    }

    async loadYouTubeVideo(url) {
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (ytMatch) {
            const videoId = ytMatch[1];
            document.getElementById('music-video').style.display = 'none';
            const container = document.getElementById('youtube-container');
            container.style.display = 'block';
            container.innerHTML = `
                <iframe width="100%" height="100%" 
                src="https://www.youtube.com/embed/${videoId}?enablejsapi=1" 
                frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            
            // Try to get video title
            try {
                const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
                const data = await response.json();
                this.currentVideoTitle = data.title;
            } catch (e) {
                this.currentVideoTitle = 'Unknown Video';
            }
            
            this.onVideoLoaded();
        }
    }

    loadUploadedVideo(file) {
        const video = document.getElementById('music-video');
        const container = document.getElementById('youtube-container');
        
        container.style.display = 'none';
        video.style.display = 'block';
        video.src = URL.createObjectURL(file);
        this.currentVideoTitle = file.name;
        
        this.onVideoLoaded();
    }

    onVideoLoaded() {
        if (this.videoLoadComments && this.videoLoadComments.length > 0) {
            const selectedPair = this.videoLoadComments[Math.floor(Math.random() * this.videoLoadComments.length)];
            this.showSpeechBubble('butthead', selectedPair.butthead);
            setTimeout(() => {
                this.showSpeechBubble('beavis', selectedPair.beavis);
            }, 2000);
        }
    }

    async generateComment() {
        if (Date.now() - this.lastCommentTime < 3000) return;

        showLoading(true);
        this.lastCommentTime = Date.now();

        try {
            const context = this.buildContext();
            const dialogue = await generateComment(this.conversationHistory, context);
            await this.processDialogue(dialogue);
        } catch (error) {
            console.error('Error generating comment:', error);
            showSpeechBubble('butthead', "Uhuhuhuh, that was, like, dumb. Try again or something.");
        }

        showLoading(false);
    }

    buildContext() {
        const videoInfo = this.currentVideoTitle ? `watching "${this.currentVideoTitle}"` : 'watching a video';
        const sessionContext = this.conversationLog.length > 5 ?
            'We\'ve been watching for a while now.' : 'Just started watching.';

        if (this.isCornholioMode) {
            return `Beavis, in his Cornholio persona (hyperactive, demanding TP for his bunghole, asking "Are you threatening me?"), and Butt-Head are ${videoInfo}. ${sessionContext} Generate their commentary, focusing on Cornholio's current needs and perspective. Butt-Head should react to Cornholio.`;
        }

        const additionalContext = [
            'They\'re sitting on their couch being lazy as usual.',
            'The TV is probably showing something stupid.',
            'They might complain about being bored or hungry.',
            'Random tangents about fire, nachos, or chicks are encouraged.'
        ];
        
        return `Beavis and Butt-Head are ${videoInfo}. ${sessionContext} ${additionalContext[Math.floor(Math.random() * additionalContext.length)]} Generate their commentary.`;
    }

    async processDialogue(dialogue) {
        const lines = dialogue.split('\n').filter(line => line.trim());
        const lineDelay = 3000; // Corrected: was misindented in original provided snippet
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const match = line.match(/^(Beavis|Butt-Head):\s*(.+)$/i);
            if (match) {
                const character = match[1].toLowerCase().replace('-', '');
                const text = match[2];
                const lowerText = text.toLowerCase();

                if (character === 'beavis' && !this.isCornholioMode) {
                    if ((lowerText.includes('tp') && lowerText.includes('bunghole')) || lowerText.includes('bungholio') || lowerText.includes('cornholio')) {
                        this.isCornholioMode = true;
                        this.beavisState = 'cornholio';
                        this.cornholioCommentCount = 0;
                        clearTimeout(this.cornholioTimeoutId);
                        this.cornholioTimeoutId = setTimeout(() => {
                            this.isCornholioMode = false;
                            if (this.beavisState === 'cornholio') {
                                this.beavisState = 'idle';
                            }
                            console.log("Cornholio mode DEACTIVATED (timer).");
                        }, this.cornholioDuration);
                        console.log("Cornholio mode ACTIVATED!");
                    }
                }

                const flags = {
                    isFire: lowerText.includes('fire') || lowerText.includes('burn'),
                    isSucks: lowerText.includes('suck'),
                    isCool: lowerText.includes('cool') || lowerText.includes('awesome')
                };
                
                await this.speakLine(character, text, flags);
                this.logComment(line);
                
                // Enhanced stats tracking for roasts and praise (ensure lowerText is defined for this scope)
                                const roastKeywords = ['suck', 'lame', 'stupid', 'dumb', 'crap', 'buttmunch'];
                                const praiseKeywords = ['cool', 'awesome', 'kick ass', 'rocks', 'rules'];
                
                const lowerText = text.toLowerCase();
                if (roastKeywords.some(keyword => lowerText.includes(keyword))) {
                    this.roastCount++;
                } else if (praiseKeywords.some(keyword => lowerText.includes(keyword))) {
                    this.praiseCount++;
                }
                
                if (i < lines.length - 1) {
                    await this.delay(lineDelay);
                }
            }
        }
        
        this.updateStats();
        this.conversationHistory.push({
            role: "assistant",
            content: dialogue
        });
    }


    async speakLine(character, text, flags = {}) {
        // Show speech bubble
        this.showSpeechBubble(character, text);
        
        // Lower video volume
        this.lowerVideoVolume();
        
        const speakerModel = character === 'butthead' ? this.buttheadModel : this.beavisModel;
        const listenerModel = character === 'butthead' ? this.beavisModel : this.buttheadModel;

        // Set character states based on flags and character
        let isSpecialStateSet = false; // This will determine if a special-to-talking timeout is needed
        const specialAnimationDuration = 1500;

        if (this.isCornholioMode && character === 'beavis') {
            this.beavisState = 'cornholio';
            this.cornholioCommentCount++;
            if (this.cornholioCommentCount >= this.cornholioMaxComments) {
                this.isCornholioMode = false;
                clearTimeout(this.cornholioTimeoutId);
                this.beavisState = 'talking'; // Transition to talking after last Cornholio comment
                console.log("Cornholio mode DEACTIVATED (comment limit).");
            }
            // No other state (like 'special_fire') applies if Beavis is Cornholio
        } else {
            // Regular state setting if not Cornholio or not Beavis
            if (character === 'beavis') {
                if (flags.isFire) {
                    this.beavisState = 'special_fire';
                    isSpecialStateSet = true;
                } else if (flags.isCool) {
                    this.beavisState = 'special_cool';
                    isSpecialStateSet = true;
                } else {
                    this.beavisState = 'talking';
                }
                this.buttheadState = 'listening';
            } else if (character === 'butthead') {
                if (flags.isSucks) {
                    this.buttheadState = 'special_sucks';
                    isSpecialStateSet = true;
                } else if (flags.isCool) {
                    this.buttheadState = 'special_cool';
                    isSpecialStateSet = true;
                } else {
                    this.buttheadState = 'talking';
                }
                this.beavisState = 'listening';
            }
        }

        if (isSpecialStateSet && !(this.isCornholioMode && character === 'beavis')) { // Don't run this timeout if Cornholio is active and just spoke
            setTimeout(() => {
                // Only transition to 'talking' if still in that special state
                if (character === 'beavis' && (this.beavisState === 'special_fire' || this.beavisState === 'special_cool')) {
                    this.beavisState = 'talking';
                } else if (character === 'butthead' && (this.buttheadState === 'special_sucks' || this.buttheadState === 'special_cool')) {
                    this.buttheadState = 'talking';
                }
            }, specialAnimationDuration);
        }

        // Enhanced 3D model animation (talking and default listening)
        let talkingAnimationInterval = null;
        let listeningAnimationInterval = null;
        let speakerOriginalRotation = null;
        let listenerOriginalRotation = null;

        if (speakerModel) {
            speakerOriginalRotation = speakerModel.rotation.clone();
            const originalPosition = speakerModel.position.clone(); // Keep original position for speaker
            
            const talkingAnimation = () => {
                // More natural talking animation
                const time = Date.now() * 0.005;
                                const rotationYIntensity = 1.1;
                                const positionYIntensity = 1.08;
                                const rotationZIntensity = 0.02;
                                const rotationXIntensity = 0.05;
                
                speakerModel.rotation.y = speakerOriginalRotation.y + Math.sin(time) * rotationYIntensity;
                speakerModel.position.y = originalPosition.y + Math.sin(time * 2) * positionYIntensity; // Use speaker's originalPosition
                speakerModel.rotation.z = speakerOriginalRotation.z + Math.sin(time * 1.5) * rotationZIntensity;
                
                // Add head bobbing
                speakerModel.rotation.x = speakerOriginalRotation.x + Math.sin(time * 3) * rotationXIntensity;
            };
            talkingAnimationInterval = setInterval(talkingAnimation, 16);
        }

        if (listenerModel && listenerModel.rotation) { // Ensure listener model and its rotation exist
            listenerOriginalRotation = listenerModel.rotation.clone();
            const listeningAnimation = () => {
                const time = Date.now() * 0.002; // Slower speed for listening
                const nodIntensity = 0.03; // Smaller intensity for nod
                // Ensure listenerOriginalRotation is not null before accessing its properties
                if (listenerOriginalRotation) {
                    listenerModel.rotation.x = listenerOriginalRotation.x + Math.sin(time) * nodIntensity;
                }
            };
            listeningAnimationInterval = setInterval(listeningAnimation, 16); // Use different interval variable
        }

        const animationDuration = 4000;
        setTimeout(() => {
            if (talkingAnimationInterval && speakerModel) { // Check if interval and model exist
                clearInterval(talkingAnimationInterval);
                // Ensure speakerOriginalRotation and the originalPosition captured at the start are available
                if (speakerModel.position && speakerOriginalRotation && typeof originalPosition !== 'undefined') {
                    speakerModel.position.copy(originalPosition); // Use the originalPosition captured before animation
                    speakerModel.rotation.copy(speakerOriginalRotation);
                }
            }
            if (listeningAnimationInterval && listenerModel && listenerModel.rotation) { // Check if interval, model and rotation exist
                clearInterval(listeningAnimationInterval);
                if (listenerOriginalRotation) { // Ensure listenerOriginalRotation is not null
                    listenerModel.rotation.copy(listenerOriginalRotation);
                }
            }
            // Reset states after animation finishes
            if (this.beavisState !== 'cornholio' || !this.isCornholioMode) {
                // If Beavis is not supposed to be Cornholio (either not in the state or mode ended), set to idle.
                this.beavisState = 'idle';
            }
            // If Cornholio mode is active and beavisState is 'cornholio', he remains 'cornholio'.
            // The separate this.cornholioTimeoutId is responsible for eventually setting him to 'idle' from 'cornholio'.

            // Butt-Head always goes to idle.
            if (this.buttheadState !== 'idle') {
                this.buttheadState = 'idle';
            }

        }, animationDuration);
        
        // ElevenLabs TTS with enhanced error handling
        if (this.voicesEnabled) {
            try {
                // Stop any currently playing audio
                if (this.currentAudio) {
                    this.currentAudio.pause();
                    this.currentAudio.currentTime = 0;
                    this.currentAudio = null;
                }
                
                // Use ElevenLabs TTS
                this.currentAudio = await this.speak(character, text);
                
                if (this.currentAudio) {
                    this.currentAudio.addEventListener('loadeddata', () => {
                        console.log('ElevenLabs audio loaded successfully');
                        this.currentAudio.play().catch(error => {
                            console.warn('Audio autoplay blocked, trying user interaction:', error);
                            // Try to play on next user interaction
                            document.addEventListener('click', () => {
                                if (this.currentAudio) {
                                    this.currentAudio.play();
                                }
                            }, { once: true });
                        });
                    });
                    
                    this.currentAudio.addEventListener('ended', () => {
                        this.restoreVideoVolume();
                        this.currentAudio = null;
                    });
                    
                    this.currentAudio.addEventListener('error', (audioError) => {
                        console.error('Audio playback error event for currentAudio:', audioError);
                        // Use a Beavis quote for audio playback specific errors
                        this.showSpeechBubble('beavis', "Heh heh. The sound thingy, like, messed up.");
                        this.restoreVideoVolume();
                        this.currentAudio = null; // Already paused/null by this point or erroring
                    });
                } else {
                    // This case means this.speak() returned null or undefined, which is an error.
                    throw new Error('No audio object was created or returned from this.speak()');
                }
                
            } catch (error) { // Catches errors from this.speak() or if this.currentAudio is null/undefined initially
                console.error('General ElevenLabs TTS Error in speakLine:', error);
                this.showSpeechBubble('beavis', "Heh heh. It's like, broken or something."); // Generic Beavis error
                this.restoreVideoVolume();
                if (this.currentAudio) { // Ensure currentAudio is handled if it exists
                    this.currentAudio.pause();
                    this.currentAudio = null;
                }
            }
        } else {
            // If voices are disabled, still ensure volume is restored after a delay
            setTimeout(() => {
                this.restoreVideoVolume();
            }, 3000);
        }
    }

    lowerVideoVolume() {
        const video = document.getElementById('music-video');
        if (video && !video.paused) {
            this.originalVideoVolume = video.volume;
            video.volume = Math.max(0.1, this.originalVideoVolume * 0.3);
        }
    }

    restoreVideoVolume() {
        const video = document.getElementById('music-video');
        if (video) {
            video.volume = this.originalVideoVolume;
        }
    }

    logComment(line) {
        const logEntry = logComment(line);
        this.conversationLog.push(logEntry);
    }

    toggleAutoMode(button) {
        this.autoMode = !this.autoMode;
        button.dataset.active = this.autoMode;
        button.textContent = `Auto Mode: ${this.autoMode ? 'ON' : 'OFF'}`;
        
        if (this.autoMode) {
            this.startAutoCommentary();
        }
    }

    startAutoCommentary() {
        if (this.autoCommentaryInterval) {
            clearInterval(this.autoCommentaryInterval);
        }
        
        if (this.autoMode) {
                        const minInterval = 10000;
                        const randomInterval = 15000;
                        const triggerProbability = 0.3;
            
            this.autoCommentaryInterval = setInterval(() => {
                if (Math.random() > triggerProbability) { // 70% chance to comment
                    this.generateComment();
                }
            }, minInterval + Math.random() * randomInterval);
        }
    }

    toggleVoices(button) {
        if (this.apiKeyMissing) {
            // Keep voices disabled if API key is missing
            this.voicesEnabled = false;
            button.textContent = 'Voices (Disabled - API Key Needed)';
            button.disabled = true;
            return;
        }
        this.voicesEnabled = !this.voicesEnabled;
        button.textContent = this.voicesEnabled ? '🔊 Voices' : '🔇 Voices';
    }

    updateStats() {
        updateStats(this.roastCount, this.praiseCount);
    }

    downloadConversation() {
        const data = {
            sessionInfo: {
                timestamp: new Date().toISOString(),
                videoTitle: this.currentVideoTitle,
                totalComments: this.conversationLog.length,
                roasts: this.roastCount,
                praise: this.praiseCount
            },
            conversation: this.conversationLog
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `beavis_butthead_commentary_${Date.now()}.json`;
        link.click();
    }

    clearSession() {
        this.conversationLog = [];
        this.conversationHistory = [];
        this.roastCount = 0;
        this.praiseCount = 0;
        document.getElementById('commentary-log').innerHTML = '';
        this.updateStats();
        
        this.showSpeechBubble('beavis', "Heh heh, starting fresh!");
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.showSpeechBubble('butthead', "Uhuhuhuh, welcome to our crib. Load up some videos so we can tell you how much they suck.");
        }, 1000);
        
        setTimeout(() => {
            this.showSpeechBubble('beavis', "Yeah! Yeah! Or if they're cool! Fire! Fire!");
        }, 4000);
    }


    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new BeavisAndButtHeadCommentary();
});