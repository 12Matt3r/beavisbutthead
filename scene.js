import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, beavisModel, buttheadModel;
let beavisBaseRotation, buttheadBaseRotation, beavisBasePosition, buttheadBasePosition;

export function setup3DEnvironment(app) {
    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Scene container not found');
        return;
    }

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('three-canvas'),
        antialias: true,
        powerPreference: "high-performance",
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    app.scene = scene;

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const cameraX = -2;
    const cameraY = -1.4;
    const cameraZ = 2;
    camera.position.set(cameraX, cameraY, cameraZ);
    app.camera = camera;

    const lightIntensity = 4.8;
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, lightIntensity);
    scene.add(light);

    loadCharacterModels(app);

    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    animate(app);
}

async function loadCharacterModels(app) {
    const loader = new GLTFLoader();

    try {
        const beavisGltf = await loader.loadAsync('./beavis.glb');
        beavisModel = beavisGltf.scene;
        const beavisScale = 35.5;
        beavisModel.scale.set(beavisScale, beavisScale, beavisScale);
        const beavisX = -0.5;
        const beavisY = -0.2;
        const beavisZ = -60;
        beavisModel.position.set(beavisX, beavisY, beavisZ);
        beavisModel.traverse((child) => {
            if (child.isMesh) {
                child.material.transparent = true;
                child.material.opacity = 0.6;
            }
        });
        beavisModel.visible = true;
        scene.add(beavisModel);
        if (beavisModel.rotation) beavisBaseRotation = beavisModel.rotation.clone();
        if (beavisModel.position) beavisBasePosition = beavisModel.position.clone();
        app.beavisModel = beavisModel;
        app.beavisBaseRotation = beavisBaseRotation;
        app.beavisBasePosition = beavisBasePosition;

        const buttheadGltf = await loader.loadAsync('./butt-head.glb');
        buttheadModel = buttheadGltf.scene;
        const buttheadScale = 18.5;
        buttheadModel.scale.set(buttheadScale, buttheadScale, buttheadScale);
        const buttheadX = -0.5;
        const buttheadY = -0.2;
        const buttheadZ = -136;
        buttheadModel.position.set(buttheadX, buttheadY, buttheadZ);
        buttheadModel.traverse((child) => {
            if (child.isMesh) {
                child.material.transparent = true;
                child.material.opacity = 0.6;
            }
        });
        buttheadModel.visible = true;
        scene.add(buttheadModel);
        if (buttheadModel.rotation) buttheadBaseRotation = buttheadModel.rotation.clone();
        if (buttheadModel.position) buttheadBasePosition = buttheadModel.position.clone();
        app.buttheadModel = buttheadModel;
        app.buttheadBaseRotation = buttheadBaseRotation;
        app.buttheadBasePosition = buttheadBasePosition;

    } catch (error) {
        console.error('Error loading 3D models:', error);
    }
}

function animate(app) {
    requestAnimationFrame(() => animate(app));

    if (camera) {
        const wobbleXSpeed = 0.0005;
        const wobbleYSpeed = 1.0003;
        const wobbleXIntensity = 1.001;
        const wobbleYIntensity = 1.001;

        camera.position.x += Math.sin(Date.now() * wobbleXSpeed) * wobbleXIntensity;
        camera.position.y += Math.cos(Date.now() * wobbleYSpeed) * wobbleYIntensity;
        camera.lookAt(0, 1, 0);
    }

    const animTime = Date.now();

    if (beavisModel && beavisBaseRotation && beavisModel.rotation && beavisBasePosition && beavisModel.position) {
        if (app.beavisState === 'special_fire') {
            const fireAnimSpeed = 0.015;
            beavisModel.rotation.x = beavisBaseRotation.x + Math.sin(animTime * fireAnimSpeed) * 0.3;
            beavisModel.position.y = beavisBasePosition.y + Math.abs(Math.sin(animTime * fireAnimSpeed * 0.5)) * 0.1;
        } else if (app.beavisState === 'special_cool') {
            const coolAnimSpeed = 0.008;
            beavisModel.rotation.x = beavisBaseRotation.x + Math.sin(animTime * coolAnimSpeed) * 0.15;
        } else if (app.beavisState === 'cornholio') {
            const time = animTime * 0.020;
            beavisModel.rotation.x = beavisBaseRotation.x + Math.sin(time * 1.5) * 0.4;
            beavisModel.rotation.y = beavisBaseRotation.y + Math.sin(time) * 0.5;
            beavisModel.rotation.z = beavisBaseRotation.z + Math.cos(time * 1.2) * 0.3;
            beavisModel.position.y = beavisBasePosition.y + Math.abs(Math.sin(time * 0.8)) * 0.15;
        } else if (app.beavisState === 'idle') {
            const idleSpeed = 0.001;
            beavisModel.rotation.y = beavisBaseRotation.y + Math.sin(animTime * idleSpeed * 0.7) * 0.05;
            beavisModel.rotation.z = beavisBaseRotation.z + Math.cos(animTime * idleSpeed * 0.5) * 0.03;
            beavisModel.rotation.x = beavisBaseRotation.x;
            beavisModel.position.y = beavisBasePosition.y;
        }
    }

    if (buttheadModel && buttheadBaseRotation && buttheadModel.rotation && buttheadBasePosition && buttheadModel.position) {
        if (app.buttheadState === 'special_sucks') {
            const sucksAnimSpeed = 0.01;
            buttheadModel.rotation.y = buttheadBaseRotation.y + Math.sin(animTime * sucksAnimSpeed) * 0.25;
            buttheadModel.rotation.z = buttheadBaseRotation.z + Math.sin(animTime * sucksAnimSpeed * 0.8) * 0.1;
        } else if (app.buttheadState === 'special_cool') {
            const coolAnimSpeed = 0.008;
            buttheadModel.rotation.x = buttheadBaseRotation.x + Math.sin(animTime * coolAnimSpeed) * 0.1;
        } else if (app.buttheadState === 'idle') {
            const idleSpeed = 0.0008;
            buttheadModel.rotation.y = buttheadBaseRotation.y + Math.sin(animTime * idleSpeed) * 0.08;
            buttheadModel.rotation.x = buttheadBaseRotation.x + Math.sin(animTime * idleSpeed * 0.5) * 0.02;
            buttheadModel.rotation.z = buttheadBaseRotation.z;
            buttheadModel.position.y = buttheadBasePosition.y;
        }
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
