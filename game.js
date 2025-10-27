// TikTok Battle Arena - 3D Physics-Based Fighting Game
// Inspired by Party Animals and Gang Beasts mechanics

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.characters = [];
        this.platform = null;
        this.blueScore = 0;
        this.redScore = 0;
        this.roundActive = false;
        
        // Responsive viewport settings
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Time tracking for deltaTime
        this.lastTime = performance.now();
        this.useAnimatedCharacters = true; // Toggle for new animation system
        this.useHybridCharacters = true; // Use new hybrid physics/animation system
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.setupPhysics();
        this.createArena();
        this.setupCamera();
        this.setupLights();
        this.setupControls();
        
        // Start with initial characters
        this.spawnCharacter('blue');
        this.spawnCharacter('red');
        
        this.startRound();
        this.animate();
    }
    
    setupScene() {
        // Three.js scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    setupPhysics() {
        // Cannon.js physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -25, 0); // Stronger gravity for better ground contact
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 20; // More iterations for stable physics
        this.world.defaultContactMaterial.friction = 0.8; // High friction to prevent sliding
        this.world.defaultContactMaterial.restitution = 0.05; // Very low bounce for stability
    }
    
    createArena() {
        // Platform
        const platformSize = { width: 30, height: 2, depth: 30 };
        
        // Visual platform
        const platformGeometry = new THREE.BoxGeometry(
            platformSize.width,
            platformSize.height,
            platformSize.depth
        );
        const platformMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513,
            shininess: 30
        });
        this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.platform.position.y = -5;
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);
        
        // Physics platform
        const platformShape = new CANNON.Box(new CANNON.Vec3(
            platformSize.width / 2,
            platformSize.height / 2,
            platformSize.depth / 2
        ));
        const platformBody = new CANNON.Body({
            mass: 0,
            shape: platformShape,
            position: new CANNON.Vec3(0, -5, 0)
        });
        this.world.addBody(platformBody);
        
        // Platform edges (visual indicators)
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 });
        const edgeGeometry = new THREE.EdgesGeometry(platformGeometry);
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        this.platform.add(edges);
        
        // Ground far below (for out-of-bounds detection)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            shape: groundShape
        });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.position.y = -50;
        this.world.addBody(groundBody);
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.width / this.height,
            0.1,
            1000
        );
        // Better initial camera position - optimal view of the action
        // Adjust based on aspect ratio for responsive design
        const cameraZ = this.getAspectRatio() > 1 ? 30 : 40; // Even closer for better view
        this.camera.position.set(0, 18, cameraZ); // Slightly lower angle
        this.camera.lookAt(0, -3, 0); // Look at platform level
    }
    
    getAspectRatio() {
        return this.width / this.height;
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 40;
        dirLight.shadow.camera.bottom = -40;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
        
        // Hemisphere light
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.5);
        this.scene.add(hemiLight);
    }
    
    setupControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let cameraRotation = { x: 0.3, y: 0 }; // Slightly lower angle for better view
        let cameraDistance = this.getAspectRatio() > 1 ? 30 : 40; // Match camera setup - closer
        
        const canvas = this.renderer.domElement;
        
        // Mouse/touch controls
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;
                
                cameraRotation.y += deltaX * 0.005;
                cameraRotation.x += deltaY * 0.005;
                cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraRotation.x));
                
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            cameraDistance += e.deltaY * 0.05;
            cameraDistance = Math.max(20, Math.min(80, cameraDistance));
        });
        
        // Touch controls
        let touchStartDistance = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && isDragging) {
                const deltaX = e.touches[0].clientX - previousMousePosition.x;
                const deltaY = e.touches[0].clientY - previousMousePosition.y;
                
                cameraRotation.y += deltaX * 0.005;
                cameraRotation.x += deltaY * 0.005;
                cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraRotation.x));
                
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const delta = distance - touchStartDistance;
                
                cameraDistance -= delta * 0.1;
                cameraDistance = Math.max(20, Math.min(80, cameraDistance));
                touchStartDistance = distance;
            }
        });
        
        canvas.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        // Update camera position based on rotation
        this.updateCamera = () => {
            this.camera.position.x = Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x) * cameraDistance;
            this.camera.position.y = Math.sin(cameraRotation.x) * cameraDistance + 8; // Lower base for better action view
            this.camera.position.z = Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x) * cameraDistance;
            this.camera.lookAt(0, -3, 0); // Look at platform level
        };
    }
    
    spawnCharacter(team) {
        // Use new HybridCharacter system for best of both worlds
        let CharacterClass;
        if (this.useHybridCharacters) {
            CharacterClass = HybridCharacter;
        } else if (this.useAnimatedCharacters) {
            CharacterClass = AnimatedCharacter;
        } else {
            CharacterClass = PhysicsCharacter;
        }
        
        const character = new CharacterClass(this, team);
        this.characters.push(character);
        this.updateCharacterCount();
        return character;
    }
    
    giveRandomPower() {
        if (this.characters.length === 0) return;
        
        const randomChar = this.characters[Math.floor(Math.random() * this.characters.length)];
        if (randomChar.isAlive) {
            randomChar.applyPowerBoost();
            this.showMessage(`${randomChar.team.toUpperCase()} team got a power boost! ⚡`);
        }
    }
    
    updateCharacterCount() {
        const blueCount = this.characters.filter(c => c.team === 'blue' && c.isAlive).length;
        const redCount = this.characters.filter(c => c.team === 'red' && c.isAlive).length;
        
        document.getElementById('blueCount').textContent = blueCount;
        document.getElementById('redCount').textContent = redCount;
    }
    
    checkRoundEnd() {
        if (!this.roundActive) return;
        
        const blueAlive = this.characters.filter(c => c.team === 'blue' && c.isAlive).length;
        const redAlive = this.characters.filter(c => c.team === 'red' && c.isAlive).length;
        
        if (blueAlive === 0 && redAlive > 0) {
            this.endRound('red');
        } else if (redAlive === 0 && blueAlive > 0) {
            this.endRound('blue');
        }
    }
    
    startRound() {
        this.roundActive = true;
        this.showMessage('Fight!', 1500);
    }
    
    endRound(winner) {
        this.roundActive = false;
        
        if (winner === 'blue') {
            this.blueScore++;
        } else {
            this.redScore++;
        }
        
        document.getElementById('blueScore').textContent = this.blueScore;
        document.getElementById('redScore').textContent = this.redScore;
        
        this.showMessage(`${winner.toUpperCase()} TEAM WINS!`, 3000);
        
        // Reset round after delay
        setTimeout(() => {
            this.resetRound();
        }, 3000);
    }
    
    resetRound() {
        // Remove all characters
        this.characters.forEach(char => char.destroy());
        this.characters = [];
        
        // Spawn new characters
        this.spawnCharacter('blue');
        this.spawnCharacter('red');
        
        this.updateCharacterCount();
        this.startRound();
    }
    
    showMessage(text, duration = 2000) {
        const roundInfo = document.getElementById('roundInfo');
        roundInfo.textContent = text;
        roundInfo.style.display = 'block';
        
        setTimeout(() => {
            roundInfo.style.display = 'none';
        }, duration);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Calculate deltaTime
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Clamp deltaTime to prevent huge jumps
        const clampedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Update physics
        this.world.step(1 / 60);
        
        // Update characters
        for (let i = this.characters.length - 1; i >= 0; i--) {
            const char = this.characters[i];
            // Pass deltaTime for smooth animations
            if (this.useHybridCharacters || this.useAnimatedCharacters) {
                char.update(clampedDeltaTime);
            } else {
                char.update();
            }
            
            // Remove and destroy characters that fell off platform
            if (char.body.position.y < -40 && char.isAlive) {
                char.die();
                char.destroy();
                this.characters.splice(i, 1);
                this.updateCharacterCount();
                this.checkRoundEnd();
            }
        }
        
        // Update camera
        if (this.updateCamera) {
            this.updateCamera();
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (game) {
        game.width = window.innerWidth;
        game.height = window.innerHeight;
        game.renderer.setSize(window.innerWidth, window.innerHeight);
        game.camera.aspect = window.innerWidth / window.innerHeight;
        game.camera.updateProjectionMatrix();
    }
});
