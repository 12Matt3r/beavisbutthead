import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
        if (this.elevenLabsApiKey === 'YOUR_ELEVENLABS_API_KEY') {
            this.apiKeyMissing = true;
            console.warn(
                '%cWARNING: ElevenLabs API Key is not set!',
                'color: yellow; font-weight: bold; font-size: 16px;'
            );
            console.warn(
                'Please replace "YOUR_ELEVENLABS_API_KEY" in app.js with your actual ElevenLabs API key.'
            );
            console.warn(
                'You can obtain an API key from https://elevenlabs.io/'
            );
            console.info('Voice functionality will be disabled until the API key is provided.');
            this.voicesEnabled = false;
        }

        await this.setup3DEnvironment();
        this.bindEvents(); // Background buttons are created/bound here
        this.setupDragAndDrop();
        this.startAutoCommentary();
        this.showWelcomeMessage();

        // Load saved background or default
        const savedBgUrl = localStorage.getItem('selectedBackgroundUrl');
        // Check if savedBgUrl is valid among the defined backgrounds
        const initialBgUrl = this.backgrounds.some(bg => bg.url === savedBgUrl) ? savedBgUrl : this.defaultBackgroundUrl;
        this.setBackground(initialBgUrl);
        // Ensure updateBackgroundButtons is called after buttons are created in bindEvents.
        // This might be better called at the end of bindEvents or if buttons are static HTML.
        // For now, let's assume dynamic buttons are created before this if init calls bindEvents first.
        // If bindEvents is called after this part of init, then updateBackgroundButtons needs to be called in bindEvents.
        // Based on current order (bindEvents before this), this should be fine.
        this.updateBackgroundButtons(initialBgUrl);
    }

    async setup3DEnvironment() {
        const container = document.getElementById('scene-container');
        if (!container) {
            console.error('Scene container not found');
            return;
        }
        
        // Create main renderer and append to the three-canvas
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('three-canvas'),
            antialias: true,
            powerPreference: "high-performance",
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        
        // Setup scene and camera
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                const cameraX = -2;
                const cameraY = -1.4;
                const cameraZ = 2;
        this.camera.position.set(cameraX, cameraY, cameraZ);
        
        // Enhanced hemisphere lighting
                const lightIntensity = 4.8;
        const light = new THREE.HemisphereLight(0xffffff, 0x444444, lightIntensity);
        this.scene.add(light);
        
        await this.loadCharacterModels();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
        
        // Start render loop
        this.animate();
    }

    async loadCharacterModels() {
        const loader = new GLTFLoader();
        
        try {
            // Load Beavis model
            const beavisGltf = await loader.loadAsync('./beavis.glb');
            this.beavisModel = beavisGltf.scene;
            /* @tweakable Beavis model scale */
            const beavisScale = 35.5;
            this.beavisModel.scale.set(beavisScale, beavisScale, beavisScale);
            /* @tweakable Beavis model X position */
            const beavisX = -0.5;
            /* @tweakable Beavis model Y position */
            const beavisY = -0.2;
            /* @tweakable Beavis model Z position */
            const beavisZ = -60;
            this.beavisModel.position.set(beavisX, beavisY, beavisZ);
            /* @tweakable Beavis model opacity for ghost effect */
            this.beavisModel.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.opacity = 0.6;
                }
            });
            this.beavisModel.visible = true;
            this.scene.add(this.beavisModel);
            if (this.beavisModel.rotation) this.beavisBaseRotation = this.beavisModel.rotation.clone();
            if (this.beavisModel.position) this.beavisBasePosition = this.beavisModel.position.clone();
            
            // Load Butt-Head model
            const buttheadGltf = await loader.loadAsync('./butt-head.glb');
            this.buttheadModel = buttheadGltf.scene;
            /* @tweakable Butthead model scale */
            const buttheadScale = 18.5;
            this.buttheadModel.scale.set(buttheadScale, buttheadScale, buttheadScale);
            /* @tweakable Butthead model X position */
            const buttheadX = -0.5;
            /* @tweakable Butthead model Y position */
            const buttheadY = -0.2;
            /* @tweakable Butthead model Z position */
            const buttheadZ = -136;
            this.buttheadModel.position.set(buttheadX, buttheadY, buttheadZ);
            /* @tweakable Butthead model opacity for ghost effect */
            this.buttheadModel.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.opacity = 0.6;
                }
            });
            this.buttheadModel.visible = true;
            this.scene.add(this.buttheadModel);
            if (this.buttheadModel.rotation) this.buttheadBaseRotation = this.buttheadModel.rotation.clone();
            if (this.buttheadModel.position) this.buttheadBasePosition = this.buttheadModel.position.clone();
            
        } catch (error) {
            console.error('Error loading 3D models:', error);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Add subtle camera movement
        if (this.camera) {
                        const wobbleXSpeed = 0.0005;
                        const wobbleYSpeed = 1.0003;
                        const wobbleXIntensity = 1.001;
                        const wobbleYIntensity = 1.001;
            
            this.camera.position.x += Math.sin(Date.now() * wobbleXSpeed) * wobbleXIntensity;
            this.camera.position.y += Math.cos(Date.now() * wobbleYSpeed) * wobbleYIntensity;
            this.camera.lookAt(0, 1, 0);
        }

        // Animations based on state
        const animTime = Date.now();

        // Beavis Animations
        if (this.beavisModel && this.beavisBaseRotation && this.beavisModel.rotation && this.beavisBasePosition && this.beavisModel.position) {
            if (this.beavisState === 'special_fire') {
                const fireAnimSpeed = 0.015; // Faster
                this.beavisModel.rotation.x = this.beavisBaseRotation.x + Math.sin(animTime * fireAnimSpeed) * 0.3; // Nodding fast
                this.beavisModel.position.y = this.beavisBasePosition.y + Math.abs(Math.sin(animTime * fireAnimSpeed * 0.5)) * 0.1; // Slight bounce
            } else if (this.beavisState === 'special_cool') {
                const coolAnimSpeed = 0.008;
                this.beavisModel.rotation.x = this.beavisBaseRotation.x + Math.sin(animTime * coolAnimSpeed) * 0.15; // Clear nod
            } else if (this.beavisState === 'talking') {
                // This state is handled by setInterval in speakLine for more complex animation.
                // If a simpler continuous talking animation is needed here, it could be added.
                // For now, relying on speakLine's animation.
            } else if (this.beavisState === 'listening') {
                 // This state is handled by setInterval in speakLine for more complex animation.
            } else if (this.beavisState === 'cornholio') {
                const time = animTime * 0.020; // Very fast
                this.beavisModel.rotation.x = this.beavisBaseRotation.x + Math.sin(time * 1.5) * 0.4; // Wild nodding/tilting
                this.beavisModel.rotation.y = this.beavisBaseRotation.y + Math.sin(time) * 0.5;     // Spinning
                this.beavisModel.rotation.z = this.beavisBaseRotation.z + Math.cos(time * 1.2) * 0.3; // Side tilt
                this.beavisModel.position.y = this.beavisBasePosition.y + Math.abs(Math.sin(time * 0.8)) * 0.15; // Bouncing higher
            } else if (this.beavisState === 'idle') {
                const idleSpeed = 0.001;
                this.beavisModel.rotation.y = this.beavisBaseRotation.y + Math.sin(animTime * idleSpeed * 0.7) * 0.05;
                this.beavisModel.rotation.z = this.beavisBaseRotation.z + Math.cos(animTime * idleSpeed * 0.5) * 0.03;
                 // Ensure X rotation and Y position are at base for idle if not animated by another state
                this.beavisModel.rotation.x = this.beavisBaseRotation.x;
                this.beavisModel.position.y = this.beavisBasePosition.y;
            }
        }

        // Butt-Head Animations
        if (this.buttheadModel && this.buttheadBaseRotation && this.buttheadModel.rotation && this.buttheadBasePosition && this.buttheadModel.position) {
            if (this.buttheadState === 'special_sucks') {
                const sucksAnimSpeed = 0.01;
                this.buttheadModel.rotation.y = this.buttheadBaseRotation.y + Math.sin(animTime * sucksAnimSpeed) * 0.25; // Side to side shake
                this.buttheadModel.rotation.z = this.buttheadBaseRotation.z + Math.sin(animTime * sucksAnimSpeed * 0.8) * 0.1; // Slight tilt
            } else if (this.buttheadState === 'special_cool') {
                const coolAnimSpeed = 0.008;
                this.buttheadModel.rotation.x = this.buttheadBaseRotation.x + Math.sin(animTime * coolAnimSpeed) * 0.1; // Slower, cooler nod
            } else if (this.buttheadState === 'talking') {
                // Relying on speakLine's animation.
            } else if (this.buttheadState === 'listening') {
                // Relying on speakLine's animation.
            } else if (this.buttheadState === 'idle') {
                const idleSpeed = 0.0008;
                this.buttheadModel.rotation.y = this.buttheadBaseRotation.y + Math.sin(animTime * idleSpeed) * 0.08;
                this.buttheadModel.rotation.x = this.buttheadBaseRotation.x + Math.sin(animTime * idleSpeed * 0.5) * 0.02;
                // Ensure Z rotation and Y position are at base for idle
                this.buttheadModel.rotation.z = this.buttheadBaseRotation.z;
                this.buttheadModel.position.y = this.buttheadBasePosition.y;
            }
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    bindEvents() {
        // Video controls
        document.getElementById('load-youtube').addEventListener('click', () => {
            const url = document.getElementById('youtube-url').value;
            if (url) this.loadYouTubeVideo(url);
        });

        document.getElementById('video-upload').addEventListener('change', (e) => {
            if (e.target.files[0]) this.loadUploadedVideo(e.target.files[0]);
        });

        // Commentary controls
        document.getElementById('trigger-comment').addEventListener('click', () => {
            this.generateComment();
        });

        document.getElementById('auto-mode').addEventListener('click', (e) => {
            this.toggleAutoMode(e.target);
        });

        document.getElementById('mute-voices').addEventListener('click', (e) => {
            this.toggleVoices(e.target);
        });

        if (this.apiKeyMissing) {
            const voicesButton = document.getElementById('mute-voices');
            if (voicesButton) {
                voicesButton.textContent = 'Voices (Disabled - API Key Needed)';
                voicesButton.disabled = true;
            }
        }

        // Session controls
        document.getElementById('download-log').addEventListener('click', () => {
            this.downloadConversation();
        });

        document.getElementById('clear-session').addEventListener('click', () => {
            this.clearSession();
        });

        // Video events
        const musicVideoElement = document.getElementById('music-video');
        if (musicVideoElement) {
            musicVideoElement.addEventListener('loadedmetadata', () => {
                this.onVideoLoaded();
            });
            musicVideoElement.addEventListener('pause', () => this.handleVideoPause());
            musicVideoElement.addEventListener('play', () => this.handleVideoPlay());
        }

        // Background selector buttons
        const bgSelectorContainer = document.getElementById('background-selector-container');
        if (bgSelectorContainer) {
            // Clear any existing buttons first (e.g., if re-binding or hot-reloading)
            bgSelectorContainer.innerHTML = '';
            this.backgrounds.forEach(bg => {
                const button = document.createElement('button');
                button.textContent = bg.name;
                button.dataset.bg = bg.url;
                button.addEventListener('click', () => {
                    this.setBackground(bg.url);
                    this.updateBackgroundButtons(bg.url);
                });
                bgSelectorContainer.appendChild(button);
            });
        }
    }

    setBackground(bgUrl) {
        const backgroundElement = document.getElementById('background');
        if (backgroundElement) {
            backgroundElement.src = bgUrl;
            localStorage.setItem('selectedBackgroundUrl', bgUrl);
        }
    }

    updateBackgroundButtons(activeBgUrl) {
       const buttons = document.querySelectorAll('.background-selection button');
       buttons.forEach(button => {
           if (button.dataset.bg === activeBgUrl) {
               button.classList.add('active-bg');
           } else {
               button.classList.remove('active-bg');
           }
       });
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
        if (Date.now() - this.lastCommentTime < 3000) return; // Rate limiting
        
        this.showLoading(true);
        this.lastCommentTime = Date.now();

        // Assuming 'websim' is a pre-configured LLM client instance.
        // If 'websim' requires API key directly in the call or per-instance configuration,
        // it might look like:
        // const websim = new WebsimClient({ apiKey: 'YOUR_WEBSIM_LLM_API_KEY_IF_NEEDED' });
        // OR
        // apiKey: 'YOUR_WEBSIM_LLM_API_KEY_IF_NEEDED', // if passed directly in create()

        try {
            const context = this.buildContext();
            // Tunable parameters for the LLM call (already existed, retained)
            const maxLines = 8;
            const minLines = 5;
            const crudenessLevel = 0.8; // Example, may not be used by all LLMs
            const tangentProbability = 0.6; // Example, may not be used by all LLMs
            
            // The 'websim' object and its 'chat.completions.create' method are now assumed to be defined
            // and correctly configured elsewhere in the application if necessary (e.g. an SDK client).
            const completion = await websim.chat.completions.create({
                // model: "websim-default-model", // Example: specify a model if required by the API
                messages: [
                    {
                        role: "system",
                        content: `You are the iconic duo Beavis and Butt-Head, providing commentary on a music video. Embody their personalities, speech patterns, and characteristic immaturity.

Beavis's Persona:
- Voice: Higher-pitched, raspy, prone to cracking. Often shouts or speaks excitedly.
- Signature Laughs/Sounds: "Heh heh", "Hmm heh hmm."
- Common Phrases: "Yeah! Yeah!", "Fire! Fire!", "Whoa!", "Cool!", "This is gonna be cool!", "Settle down, Beavis" (usually said by Butt-Head).
- Personality: Hyperactive, easily excited by simple things (especially fire, explosions, destruction, things he deems "cool"). Less intelligent, often misinterprets things, prone to nonsensical comments. Can sometimes devolve into his Cornholio persona ("I am Cornholio! I need TP for my bunghole!") especially if he has sugar or caffeine (though don't overdo Cornholio unless the context is exceptionally fitting). Easily distracted. Obsessed with "chicks" but has no idea how to talk to them.

Butt-Head's Persona:
- Voice: Lower-pitched, monotone, often mumbles or speaks through a slight sneer.
- Signature Laughs/Sounds: "Uh huh huh", "Hmm hmm hmm."
- Common Phrases: "This sucks", "That sucks", "Dumbass", "Whoa", "Cool", "Check it out Beavis", "What a dork", "That's not cool."
- Personality: Calmer than Beavis but deeply cynical and apathetic. Considers himself the smarter of the two (though that's not saying much). More dominant, often directs or insults Beavis. Primary interests are TV, nachos, "chicks" (though equally clueless as Beavis), and things he deems "cool" (usually heavy metal or destructive things). Quick to call things "lame" or "stupid."

Interaction Style:
- Generate a back-and-forth dialogue. Lines MUST alternate and be prefixed with "Beavis:" or "Butt-Head:".
- They often misunderstand the video's content or focus on irrelevant details.
- Comments should be frequently crude, immature, and irreverent, reflecting their humor.
- They might make random tangents related to their interests (nachos, TV, girls, music, etc.).
- Butt-Head often insults Beavis. Beavis might whine, get overly enthusiastic, or misinterpret Butt-Head's insults.

Output Format:
- Prefix each line with "Beavis:" or "Butt-Head:".
- The commentary should be between ${minLines} and ${maxLines} lines in total.
- Keep it fast-paced, dumb, and funny, true to the original show.
- You can mock the user who submitted the video if it feels natural.

Current session context:
- We've been watching videos for a bit.
- Current session stats: ${this.roastCount} roasts, ${this.praiseCount} praises for previous videos.
- Beavis and Butt-Head are on their couch, being lazy as usual.
- The user has just loaded this new video.
`
                    },
                    ...this.conversationHistory.slice(-6),
                    {
                        role: "user",
                        content: context
                    }
                ]
            });

            const dialogue = completion.content;
            await this.processDialogue(dialogue);
            
        } catch (error) {
            console.error('Error generating comment:', error);
            this.showSpeechBubble('butthead', "Uhuhuhuh, that was, like, dumb. Try again or something.");
        }
        
        this.showLoading(false);
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

    async speakBeavis(text) {
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.beavisVoiceId}/stream`, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.elevenLabsApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    model_id: this.elevenLabsModel,
                    voice_settings: {
                        stability: this.voiceStability,
                        similarity_boost: this.voiceSimilarityBoost
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
                        audio.volume = 0.9;
            return audio;
        } catch (err) {
            console.error("Error in speakBeavis TTS fetch/blob processing:", err); // More specific
            throw err; // Re-throw for speakLine to handle
        }
    }

    async speakButthead(text) {
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.buttheadVoiceId}/stream`, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.elevenLabsApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    model_id: this.elevenLabsModel,
                    voice_settings: {
                        stability: this.voiceStability,
                        similarity_boost: this.voiceSimilarityBoost
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
                        audio.volume = 0.9;
            return audio;
        } catch (err) {
            console.error("Error in speakButthead TTS fetch/blob processing:", err); // More specific
            throw err; // Re-throw for speakLine to handle
        }
    }

    async speak(character, text) {
        const cleanText = text.replace(/^(Beavis|Butt-Head):\s*/i, '').trim();
        if (character === 'beavis') {
            return await this.speakBeavis(cleanText);
        } else if (character === 'butthead') {
            return await this.speakButthead(cleanText);
        }
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

    showSpeechBubble(character, text) {
        const bubbleId = character === 'butthead' ? 'butthead-bubble' : 'beavis-bubble';
        const bubble = document.getElementById(bubbleId);
        const textEl = bubble.querySelector('.bubble-text');
        
        // Hide any existing bubbles
        document.querySelectorAll('.speech-bubble').forEach(b => b.classList.remove('show'));
        
        textEl.textContent = text;
        bubble.classList.add('show');
        
        setTimeout(() => {
            bubble.classList.remove('show');
        }, 4000);
    }

    logComment(line) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, line };
        this.conversationLog.push(logEntry);
        
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
        document.getElementById('roast-counter').textContent = 
            `Roasts: ${this.roastCount} | Praise: ${this.praiseCount}`;
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

    showLoading(show) {
        document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ElevenLabs TTS configuration
BeavisAndButtHeadCommentary.prototype.elevenLabsApiKey = 'YOUR_ELEVENLABS_API_KEY';
BeavisAndButtHeadCommentary.prototype.beavisVoiceId = 'pEfTHkEIueCQNaZduR2d';
BeavisAndButtHeadCommentary.prototype.buttheadVoiceId = 'wQstqXHZPHMnzsBJaYHg';
BeavisAndButtHeadCommentary.prototype.elevenLabsModel = 'eleven_multilingual_v2';
BeavisAndButtHeadCommentary.prototype.voiceStability = 0.3;
BeavisAndButtHeadCommentary.prototype.voiceSimilarityBoost = 0.9;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new BeavisAndButtHeadCommentary();
});