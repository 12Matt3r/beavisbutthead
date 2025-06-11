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
        this.bindEvents();
        this.setupDragAndDrop();
        this.startAutoCommentary();
        this.showWelcomeMessage();
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
        const video = document.getElementById('music-video');
        video.addEventListener('loadedmetadata', () => {
            this.onVideoLoaded();
        });
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
            const boundaryPadding = 20;
            const elementRect = element.getBoundingClientRect();
            const maxLeft = window.innerWidth - elementRect.width - boundaryPadding;
            const maxTop = window.innerHeight - elementRect.height - boundaryPadding;
            
            newLeft = Math.max(boundaryPadding, Math.min(maxLeft, newLeft));
            newTop = Math.max(boundaryPadding, Math.min(maxTop, newTop));
            
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
                
                element.style.position = 'absolute';
                element.style.left = `${tvScreen.offsetLeft + relativeX}px`;
                element.style.top = `${tvScreen.offsetTop + relativeY}px`;
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
        this.showSpeechBubble('butthead', "Uhuhuhuh, alright! Let's see what kind of crap this is gonna be.");
        setTimeout(() => {
            this.showSpeechBubble('beavis', "Yeah! Yeah! This better not suck!");
        }, 2000);
    }

    async generateComment() {
        if (Date.now() - this.lastCommentTime < 3000) return; // Rate limiting
        
        this.showLoading(true);
        this.lastCommentTime = Date.now();

        // Check if websim and its nested properties are defined
        if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions || !websim.chat.completions.create) {
            console.error(
                "ERROR: LLM API (websim) is not defined or not properly configured."
            );
            console.info(
                "This application uses a placeholder 'websim' for Large Language Model (LLM) API calls."
            );
            console.info(
                "Please integrate your actual LLM SDK or API call by replacing 'websim.chat.completions.create(...)' in app.js."
            );
            console.info(
                "Suggestion: Replace 'websim.chat.completions.create(...)' with your chosen LLM API call (e.g., OpenAI, Anthropic, Gemini, or a custom local model)."
            );

            this.showSpeechBubble('butthead', "Uhuhuhuh, my brain ain't workin'. Tell the nerd who made this to fix the comment thingy.");
            this.showLoading(false);
            return; // Prevent further execution
        }

        try {
            const context = this.buildContext();
                        const maxLines = 8;
                        const minLines = 5;
                        const crudenessLevel = 0.8;
                        const tangentProbability = 0.6;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are Beavis and Butt-Head, watching a music video in their living room just like the classic MTV series. Your job is to give a short, funny back-and-forth commentary using your signature style.

                        Respond in alternating lines, prefixing each with 'Beavis:' or 'Butt-Head:'. Use your iconic speech quirks — Beavis says 'heh heh', screams 'FIRE!', and occasionally becomes Cornholio. Butt-Head says 'uh huh huh', is sarcastic, and often insults Beavis or the video.

                        The tone should be crude, goofy, and irreverent, but still clever. Roasts, immature jokes, random tangents, and off-topic interruptions are encouraged. Reference things like nachos, chicks, TV, fart jokes, and the laziness of watching videos all day. Mock the user who submitted the video when appropriate, and stay in character the entire time.

                        Limit output to ${minLines}–${maxLines} lines max, alternating between the two characters. Keep it fast, dumb, and funny — like the original show.
                        
                        Current session stats: ${this.roastCount} roasts, ${this.praiseCount} praise`
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
        
                const lineDelay = 3000;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const match = line.match(/^(Beavis|Butt-Head):\s*(.+)$/i);
            if (match) {
                const character = match[1].toLowerCase().replace('-', '');
                const text = match[2];
                
                await this.speakLine(character, text);
                this.logComment(line);
                
                // Enhanced stats tracking for roasts and praise
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

    async speakLine(character, text) {
        // Show speech bubble
        this.showSpeechBubble(character, text);
        
        // Lower video volume
        this.lowerVideoVolume();
        
        // Enhanced 3D model animation
        const model = character === 'butthead' ? this.buttheadModel : this.beavisModel;
        if (model) {
            const originalPosition = model.position.clone();
            const originalRotation = model.rotation.clone();
            
            const talkingAnimation = () => {
                // More natural talking animation
                const time = Date.now() * 0.005;
                                const rotationYIntensity = 1.1;
                                const positionYIntensity = 1.08;
                                const rotationZIntensity = 0.02;
                                const rotationXIntensity = 0.05;
                
                model.rotation.y = originalRotation.y + Math.sin(time) * rotationYIntensity;
                model.position.y = originalPosition.y + Math.sin(time * 2) * positionYIntensity;
                model.rotation.z = originalRotation.z + Math.sin(time * 1.5) * rotationZIntensity;
                
                // Add head bobbing
                model.rotation.x = originalRotation.x + Math.sin(time * 3) * rotationXIntensity;
            };
            
            const animationInterval = setInterval(talkingAnimation, 16);
            
                        const animationDuration = 4000;
            setTimeout(() => {
                clearInterval(animationInterval);
                if (model) {
                    model.position.copy(originalPosition);
                    model.rotation.copy(originalRotation);
                }
            }, animationDuration);
        }
        
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