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
        this.world.gravity.set(0, -30, 0); // Strong gravity for fun physics
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.3;
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
        const character = new Character(this, team);
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
        
        // Update physics
        this.world.step(1 / 60);
        
        // Update characters
        for (let i = this.characters.length - 1; i >= 0; i--) {
            const char = this.characters[i];
            char.update();
            
            // Remove dead characters that fell off
            if (char.body.position.y < -40 && char.isAlive) {
                char.die();
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

class Character {
    constructor(game, team) {
        this.game = game;
        this.team = team;
        this.isAlive = true;
        this.isKnockedOut = false;
        this.knockoutTimer = 0;
        this.wakeupProgress = 0;
        this.isGrabbing = false;
        this.grabbedTarget = null;
        this.isGrabbed = false;
        
        // AI state
        this.aiState = 'idle';
        this.aiTarget = null;
        this.aiTimer = 0;
        this.actionCooldown = 0;
        
        // Stats
        this.health = 100;
        this.strength = 1.0;
        this.speed = 1.0;
        
        this.createBody();
        this.setupAI();
    }
    
    createBody() {
        // Ragdoll-like character using connected shapes
        const color = this.team === 'blue' ? 0x4A90E2 : 0xE24A4A;
        
        // Main body (torso) - using box geometry with rounder/funnier proportions
        const bodyGeometry = new THREE.BoxGeometry(1.8, 2.2, 1.2); // Wider, slightly taller
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 50
        });
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.castShadow = true;
        this.game.scene.add(this.mesh);
        
        // Spawn position based on team - ON the platform, further from edges
        const spawnX = this.team === 'blue' ? -6 : 6; // Closer to center to avoid edge issues
        const spawnZ = (Math.random() - 0.5) * 4; // Even narrower Z range (-2 to +2)
        const spawnY = -2; // Just above platform surface (platform top is at -4, character radius 1.2)
        
        // Physics body - use box shape for upright standing (Gang Beasts style)
        // Box shape prevents rolling and keeps characters standing upright
        const bodyShape = new CANNON.Box(new CANNON.Vec3(0.6, 1.2, 0.6));
        this.body = new CANNON.Body({
            mass: 5,
            shape: bodyShape,
            position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
            linearDamping: 0.1, // Very low damping for maximum movement
            angularDamping: 0.95, // Very high to strongly resist rotation
            fixedRotation: false, // Allow rotation but heavily controlled
            sleepSpeedLimit: 0.01, // Very low threshold to prevent unwanted sleeping
            sleepTimeLimit: 100 // Only sleep after being still for a long time
        });
        
        // Ensure body starts perfectly upright
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
        
        // Add friction for better ground contact
        this.body.material = new CANNON.Material();
        this.body.material.friction = 1.0; // High friction for no slipping
        this.body.material.restitution = 0.1; // Low bounce for stability
        
        this.game.world.addBody(this.body);
        
        // Track impact state for reactions
        this.lastHitTime = 0;
        this.isStunned = false;
        
        // Add head - MUCH BIGGER for comedic effect (like Party Animals)
        const headGeometry = new THREE.SphereGeometry(0.9, 16, 16); // Much bigger head
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFDBAC,
            shininess: 30
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 2.0; // Higher to accommodate bigger head
        this.mesh.add(this.head);
        
        // Add funny eyes for personality
        const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.25, 0.15, 0.8);
        this.head.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.25, 0.15, 0.8);
        this.head.add(this.rightEye);
        
        // Add mouth for expression
        const mouthGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
        const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        this.mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        this.mouth.position.set(0, -0.2, 0.85);
        this.head.add(this.mouth);
        
        // Add arms using cylinders - longer and thinner for comedic effect
        const armGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 8);
        const armMaterial = new THREE.MeshPhongMaterial({ color: color });
        
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-1.1, 0.5, 0);
        this.leftArm.rotation.z = Math.PI / 4;
        this.mesh.add(this.leftArm);
        
        // Add hands for more personality
        const handGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const handMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBAC });
        
        this.leftHand = new THREE.Mesh(handGeometry, handMaterial);
        this.leftHand.position.y = -0.8;
        this.leftArm.add(this.leftHand);
        
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(1.1, 0.5, 0);
        this.rightArm.rotation.z = -Math.PI / 4;
        this.mesh.add(this.rightArm);
        
        this.rightHand = new THREE.Mesh(handGeometry, handMaterial);
        this.rightHand.position.y = -0.8;
        this.rightArm.add(this.rightHand);
        
        // Add legs using cylinders - thicker and shorter for stubby comedic look
        const legGeometry = new THREE.CylinderGeometry(0.4, 0.35, 1.3, 8);
        const legMaterial = new THREE.MeshPhongMaterial({ color: color });
        
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.5, -1.5, 0);
        this.mesh.add(this.leftLeg);
        
        // Add feet for more personality
        const footGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.8);
        const footMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        this.leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.leftFoot.position.set(0, -0.7, 0.15);
        this.leftLeg.add(this.leftFoot);
        
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.5, -1.5, 0);
        this.mesh.add(this.rightLeg);
        
        this.rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.rightFoot.position.set(0, -0.7, 0.15);
        this.rightLeg.add(this.rightFoot);
    }
    
    setupAI() {
        this.changeAIState('seeking');
    }
    
    changeAIState(newState) {
        this.aiState = newState;
        this.aiTimer = 0;
    }
    
    update() {
        if (!this.isAlive) return;
        
        // Sync visual mesh with physics body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        
        // ALWAYS keep character upright (Gang Beasts style stabilization)
        // Even when knocked out or stunned, maintain upright orientation
        if (!this.isKnockedOut) {
            this.stabilizeUpright();
        }
        
        // Handle knocked out state
        if (this.isKnockedOut) {
            this.knockoutTimer--;
            
            if (this.isGrabbed) {
                // Try to wake up faster when grabbed - struggle animation
                this.wakeupProgress += 0.5;
                this.animateStruggle();
                if (this.wakeupProgress > 100) {
                    this.wakeUp();
                }
            } else {
                // Natural recovery
                if (this.knockoutTimer <= 0) {
                    this.wakeUp();
                }
            }
            
            // Visual feedback for knocked out
            this.mesh.material.opacity = 0.7;
            return;
        }
        
        // Handle stun recovery
        if (this.isStunned) {
            const timeSinceHit = Date.now() - this.lastHitTime;
            if (timeSinceHit > 800) {
                this.isStunned = false;
            } else {
                // Stagger/stumble animation
                this.animateStagger();
            }
        }
        
        // Update AI
        this.updateAI();
        
        // Always keep physics body awake during active gameplay
        this.body.wakeUp();
        
        // Cooldown management
        if (this.actionCooldown > 0) {
            this.actionCooldown--;
        }
        
        // Animate limbs
        this.animateLimbs();
    }
    
    stabilizeUpright() {
        // Less aggressive upright stabilization to allow more physics fun
        // Only stabilize when not being hit or in combat
        
        // Skip stabilization when stunned (just got hit) - let physics play out!
        if (this.isStunned) {
            return;
        }
        
        // Get current rotation as euler angles
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        euler.setFromQuaternion(quat, 'XYZ');
        
        // Calculate tilt from vertical (we want X and Z rotations near 0)
        const tiltX = euler.x;
        const tiltZ = euler.z;
        
        // Much weaker corrective torque to allow wobbling and physics fun
        const correctionStrength = 150; // Half as strong for more movement
        
        // Apply torque to counter the tilt
        const correctionTorque = new CANNON.Vec3(
            -tiltX * correctionStrength,
            0, // Don't affect Y rotation (turning)
            -tiltZ * correctionStrength
        );
        this.body.torque.vadd(correctionTorque, this.body.torque);
        
        // Less dampening to allow more wobble
        this.body.angularVelocity.x *= 0.7;
        this.body.angularVelocity.z *= 0.7;
        
        // Allow more spinning
        if (Math.abs(this.body.angularVelocity.y) > 3) {
            this.body.angularVelocity.y *= 0.9;
        }
        
        // Only apply strong correction if VERY tilted
        const maxTilt = 0.5; // Much higher threshold - allow more tilt
        if (Math.abs(tiltX) > maxTilt || Math.abs(tiltZ) > maxTilt) {
            // Gentler correction
            this.body.angularVelocity.x *= 0.5;
            this.body.angularVelocity.z *= 0.5;
            
            const emergencyTorque = new CANNON.Vec3(
                -tiltX * correctionStrength * 2,
                0,
                -tiltZ * correctionStrength * 2
            );
            this.body.torque.vadd(emergencyTorque, this.body.torque);
        }
        
        // Only force upright if completely fallen over
        const criticalTilt = 1.2; // Much higher threshold
        if (Math.abs(tiltX) > criticalTilt || Math.abs(tiltZ) > criticalTilt) {
            // Emergency reset - force upright quaternion
            const yRotation = euler.y;
            this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yRotation);
            this.body.angularVelocity.set(0, this.body.angularVelocity.y * 0.5, 0);
        }
    }
    
    animateStruggle() {
        // Flailing animation when grabbed - MUCH MORE DRAMATIC (Party Animals style)
        const time = Date.now() * 0.03; // Faster for more visibility
        const intensity = 1.5; // Much stronger struggle
        
        if (this.leftArm) {
            this.leftArm.rotation.x = Math.sin(time * 1.5) * intensity * 1.5; // Huge arm flailing
            this.leftArm.rotation.z = Math.PI / 4 + Math.cos(time * 1.2) * intensity * 1.2;
            if (this.leftHand) {
                this.leftHand.rotation.x = Math.sin(time * 3) * 1.5;
                this.leftHand.scale.set(1.2, 1.2, 1.2); // Bigger for visibility
            }
        }
        if (this.rightArm) {
            this.rightArm.rotation.x = Math.sin(time * 1.3 + Math.PI) * intensity * 1.5;
            this.rightArm.rotation.z = -Math.PI / 4 + Math.cos(time * 1.4) * intensity * 1.2;
            if (this.rightHand) {
                this.rightHand.rotation.x = Math.sin(time * 3 + Math.PI) * 1.5;
                this.rightHand.scale.set(1.2, 1.2, 1.2);
            }
        }
        if (this.leftLeg) {
            this.leftLeg.rotation.x = Math.sin(time * 1.1) * 1.0; // Kicking motion
            if (this.leftFoot) this.leftFoot.rotation.x = Math.sin(time * 2) * 0.8;
        }
        if (this.rightLeg) {
            this.rightLeg.rotation.x = Math.sin(time * 1.1 + Math.PI) * 1.0;
            if (this.rightFoot) this.rightFoot.rotation.x = Math.sin(time * 2 + Math.PI) * 0.8;
        }
        if (this.head) {
            this.head.rotation.y = Math.sin(time * 0.8) * 0.7; // More dramatic head shake
            this.head.rotation.x = Math.sin(time * 0.9) * 0.4;
            this.head.rotation.z = Math.sin(time * 1.1) * 0.3;
        }
        // Eyes wide in panic
        if (this.leftEye && this.rightEye) {
            this.leftEye.scale.set(1.5, 1.5, 1.5);
            this.rightEye.scale.set(1.5, 1.5, 1.5);
        }
        // Mouth open in distress
        if (this.mouth) {
            this.mouth.scale.set(1.3, 2, 1);
        }
    }
    
    animateStagger() {
        // Stumbling animation after being hit - MUCH MORE VISIBLE (comedic effect)
        const time = Date.now() - this.lastHitTime;
        const t = time / 800; // 0 to 1 over stun duration
        const wobble = Math.sin(time * 0.05) * (1 - t) * 1.5; // Much stronger wobble
        
        if (this.leftArm) {
            this.leftArm.rotation.z = Math.PI / 4 + wobble * 1.5; // Big arm wobble
            this.leftArm.rotation.x = wobble * 1.2;
            if (this.leftHand) this.leftHand.rotation.x = wobble * 1.0;
        }
        if (this.rightArm) {
            this.rightArm.rotation.z = -Math.PI / 4 - wobble * 1.5;
            this.rightArm.rotation.x = -wobble * 1.2;
            if (this.rightHand) this.rightHand.rotation.x = -wobble * 1.0;
        }
        if (this.head) {
            this.head.rotation.x = wobble * 0.8; // More head movement
            this.head.rotation.z = wobble * 0.9;
            this.head.rotation.y = wobble * 0.6;
        }
        // Dazed eyes
        if (this.leftEye && this.rightEye) {
            this.leftEye.rotation.z = wobble * 0.5;
            this.rightEye.rotation.z = -wobble * 0.5;
        }
        // Add leg stagger
        if (this.leftLeg) {
            this.leftLeg.rotation.x = wobble * 0.6;
            if (this.leftFoot) this.leftFoot.rotation.x = wobble * 0.4;
        }
        if (this.rightLeg) {
            this.rightLeg.rotation.x = -wobble * 0.6;
            if (this.rightFoot) this.rightFoot.rotation.x = -wobble * 0.4;
        }
    }
    
    updateAI() {
        this.aiTimer++;
        
        switch (this.aiState) {
            case 'seeking':
                this.seekEnemy();
                break;
            case 'attacking':
                this.attackEnemy();
                break;
            case 'grabbing':
                this.updateGrab();
                break;
        }
    }
    
    seekEnemy() {
        // Find nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        for (const char of this.game.characters) {
            if (char.team !== this.team && char.isAlive && !char.isKnockedOut) {
                const distance = this.body.position.distanceTo(char.body.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = char;
                }
            }
        }
        
        if (nearestEnemy) {
            this.aiTarget = nearestEnemy;
            
            if (nearestDistance < 4) {
                // Close enough to attack
                this.changeAIState('attacking');
            } else {
                // Move towards enemy
                this.moveTowards(nearestEnemy.body.position);
            }
        }
        
        // Also look for knocked out enemies to grab
        for (const char of this.game.characters) {
            if (char.team !== this.team && char.isAlive && char.isKnockedOut && !char.isGrabbed) {
                const distance = this.body.position.distanceTo(char.body.position);
                if (distance < 4) {
                    this.grabCharacter(char);
                    break;
                }
            }
        }
    }
    
    attackEnemy() {
        if (!this.aiTarget || !this.aiTarget.isAlive || this.aiTarget.isKnockedOut) {
            this.changeAIState('seeking');
            return;
        }
        
        const distance = this.body.position.distanceTo(this.aiTarget.body.position);
        
        if (distance > 6) {
            // Target too far, go back to seeking
            this.changeAIState('seeking');
            return;
        }
        
        if (distance < 3.5 && this.actionCooldown === 0 && !this.isStunned) {
            // Perform attack - varied attack patterns (Gang Beasts style)
            const attackType = Math.random();
            
            if (attackType < 0.4) {
                this.punch(this.aiTarget);
            } else if (attackType < 0.7) {
                this.dropkick(this.aiTarget);
            } else if (attackType < 0.85) {
                this.headbutt(this.aiTarget);
            } else {
                this.jumpAttack(this.aiTarget);
            }
            
            this.actionCooldown = 40 + Math.random() * 50; // Varied cooldown
        } else if (distance > 2.5 && !this.isStunned) {
            // Move closer to optimal attack range
            this.moveTowards(this.aiTarget.body.position);
        } else if (!this.isStunned) {
            // In optimal range, circle and prepare to attack (Party Animals behavior)
            // Add continuous movement to stay dynamic and unpredictable
            const CIRCLE_FORCE_MAGNITUDE = 100; // Force magnitude for circling behavior
            const circleDirection = new CANNON.Vec3(
                (Math.random() - 0.5) * CIRCLE_FORCE_MAGNITUDE,
                0,
                (Math.random() - 0.5) * CIRCLE_FORCE_MAGNITUDE
            );
            this.body.applyForce(circleDirection, this.body.position);
            
            // Add small impulses periodically to maintain movement when velocity is low
            const currentSpeed = Math.sqrt(this.body.velocity.x**2 + this.body.velocity.z**2);
            if (this.aiTimer % 20 === 0 && currentSpeed < 2) {
                const impulse = new CANNON.Vec3(
                    (Math.random() - 0.5) * 5,
                    0,
                    (Math.random() - 0.5) * 5
                );
                this.body.applyImpulse(impulse, this.body.position);
            }
            
            // Occasional feint - wind up but don't attack
            if (this.aiTimer % 80 === 0 && Math.random() < 0.3) {
                this.animateFeint();
            }
        }
    }
    
    animateFeint() {
        // Fake attack wind-up (comedic timing)
        if (this.rightArm) {
            this.rightArm.rotation.z = -Math.PI / 6;
            setTimeout(() => {
                if (this.rightArm) {
                    this.rightArm.rotation.z = -Math.PI / 4;
                }
            }, 200);
        }
    }
    
    moveTowards(targetPos) {
        // Check distance from platform center to avoid running off edge
        const distFromCenter = Math.sqrt(
            Math.pow(this.body.position.x, 2) + Math.pow(this.body.position.z, 2)
        );
        
        const direction = new CANNON.Vec3();
        direction.copy(targetPos);
        direction.vsub(this.body.position);
        direction.y = 0; // Don't move vertically
        direction.normalize();
        
        // If too close to edge, blend in center-seeking force
        if (distFromCenter > 11) {
            const toCenterDirection = new CANNON.Vec3(
                -this.body.position.x,
                0,
                -this.body.position.z
            );
            toCenterDirection.normalize();
            
            // Blend forces: more toward center as we get closer to edge
            const centerWeight = Math.min((distFromCenter - 11) / 3, 1); // 0 to 1 as dist goes from 11 to 14
            const targetWeight = 1 - centerWeight;
            
            direction.x = direction.x * targetWeight + toCenterDirection.x * centerWeight;
            direction.z = direction.z * targetWeight + toCenterDirection.z * centerWeight;
            direction.normalize();
        }
        
        // Apply force at the center of mass for better balance
        const force = direction.scale(600 * this.speed); // Much stronger force for visible movement
        this.body.applyForce(force, this.body.position);
        
        // Wake up the body if it's sleeping
        this.body.wakeUp();
        
        // Limit speed
        const maxSpeed = 20 * this.speed; // Much higher max speed for dynamic action
        const velocity = this.body.velocity;
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (horizontalSpeed > maxSpeed) {
            const scale = maxSpeed / horizontalSpeed;
            this.body.velocity.x *= scale;
            this.body.velocity.z *= scale;
        }
        
        // Keep character grounded - prevent floating
        if (this.body.position.y > -2.5) {
            this.body.velocity.y = Math.min(this.body.velocity.y, 0);
        }
        
        // Keep character from sinking through platform
        if (this.body.position.y < -3.5) {
            this.body.position.y = -2;
            this.body.velocity.y = Math.max(this.body.velocity.y, 0);
        }
    }
    
    punch(target) {
        // VERY DRAMATIC wind-up telegraph (Gang Beasts style)
        if (this.rightArm) {
            this.rightArm.rotation.z = -Math.PI / 6;
            this.rightArm.rotation.x = -0.8; // More exaggerated wind-up
            this.rightHand.scale.set(1.5, 1.5, 1.5); // Hand grows for comedic effect
        }
        
        // Lean back for more dramatic wind-up
        const leanBack = new CANNON.Vec3(
            (this.body.position.x - target.body.position.x) * 50,
            0,
            (this.body.position.z - target.body.position.z) * 50
        );
        this.body.applyForce(leanBack, this.body.position);
        
        // Longer delay for more visible wind-up
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // Apply MUCH STRONGER force to target
            const direction = new CANNON.Vec3();
            direction.copy(target.body.position);
            direction.vsub(this.body.position);
            direction.y = 0.5; // Upward angle for dramatic launch
            direction.normalize();
            
            const force = direction.scale(500 * this.strength); // Much stronger impact
            target.body.applyImpulse(force, target.body.position);
            
            // Apply impact reaction to target
            target.reactToHit(direction);
            
            // Damage target
            target.takeDamage(20 * this.strength);
            
            // HUGE punch extension animation
            if (this.rightArm) {
                this.rightArm.rotation.z = -Math.PI / 2;
                this.rightArm.position.x = 1.8; // Extended further
                this.rightArm.rotation.x = 0;
                this.rightHand.scale.set(1, 1, 1);
                
                setTimeout(() => {
                    if (this.rightArm) {
                        // Return to normal
                        this.rightArm.rotation.z = -Math.PI / 4;
                        this.rightArm.position.x = 1.1;
                        this.rightArm.rotation.x = 0;
                    }
                }, 200);
            }
            
            // Bigger recoil to puncher for comedy
            const recoil = direction.scale(-30);
            this.body.applyImpulse(recoil, this.body.position);
        }, 250); // Longer wind-up for visibility
    }
    
    headbutt(target) {
        // New attack type inspired by Gang Beasts
        // Wind-up by leaning back
        const direction = new CANNON.Vec3();
        direction.copy(target.body.position);
        direction.vsub(this.body.position);
        direction.y = 0;
        direction.normalize();
        
        // Lean back slightly
        const leanBack = direction.scale(-30);
        this.body.applyForce(leanBack, this.body.position);
        
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // Lunge forward with head
            const lungeForce = direction.scale(400 * this.strength);
            this.body.applyImpulse(lungeForce, this.body.position);
            
            // Check if hit
            const dist = this.body.position.distanceTo(target.body.position);
            if (dist < 3) {
                const headbuttForce = direction.scale(350 * this.strength);
                headbuttForce.y = 80;
                target.body.applyImpulse(headbuttForce, target.body.position);
                target.takeDamage(25 * this.strength);
                target.reactToHit(direction);
                
                // Dizzy effect on both characters (comedic)
                if (this.head) {
                    const originalY = this.head.rotation.y;
                    let spinCount = 0;
                    const spinInterval = setInterval(() => {
                        if (this.head && spinCount < 6) {
                            this.head.rotation.y += 0.3;
                            spinCount++;
                        } else {
                            if (this.head) this.head.rotation.y = originalY;
                            clearInterval(spinInterval);
                        }
                    }, 50);
                }
            }
        }, 300);
    }
    
    jumpAttack(target) {
        // Jumping punch attack (Party Animals style)
        // Jump up first
        this.body.velocity.y = 12;
        
        // Both arms raised
        if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.z = Math.PI / 2;
            this.rightArm.rotation.z = -Math.PI / 2;
            this.leftArm.rotation.x = -0.5;
            this.rightArm.rotation.x = -0.5;
        }
        
        setTimeout(() => {
            if (!this.isAlive) return;
            
            const direction = new CANNON.Vec3();
            direction.copy(target.body.position);
            direction.vsub(this.body.position);
            direction.y = -0.5; // Downward angle
            direction.normalize();
            
            const dist = this.body.position.distanceTo(target.body.position);
            if (dist < 4) {
                const slamForce = direction.scale(400 * this.strength);
                target.body.applyImpulse(slamForce, target.body.position);
                target.takeDamage(30 * this.strength);
                target.reactToHit(direction);
            }
            
            // Return arms to normal
            setTimeout(() => {
                if (this.leftArm) {
                    this.leftArm.rotation.z = Math.PI / 4;
                    this.leftArm.rotation.x = 0;
                }
                if (this.rightArm) {
                    this.rightArm.rotation.z = -Math.PI / 4;
                    this.rightArm.rotation.x = 0;
                }
            }, 200);
        }, 400);
    }
    
    reactToHit(hitDirection) {
        // MUCH MORE DRAMATIC impact reaction (Party Animals/Gang Beasts style)
        this.lastHitTime = Date.now();
        this.isStunned = true;
        
        // HUGE flail arms on impact (very comedic effect)
        if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.x = 2.0; // Much bigger flail
            this.rightArm.rotation.x = 2.0;
            this.leftArm.rotation.z = Math.PI / 2;
            this.rightArm.rotation.z = -Math.PI / 2;
            
            setTimeout(() => {
                if (this.leftArm) this.leftArm.rotation.x = 0;
                if (this.rightArm) this.rightArm.rotation.x = 0;
            }, 400);
        }
        
        // Exaggerated facial expression when hit
        if (this.leftEye && this.rightEye) {
            this.leftEye.scale.set(1.5, 0.5, 1); // Squished eyes
            this.rightEye.scale.set(1.5, 0.5, 1);
            setTimeout(() => {
                if (this.leftEye) this.leftEye.scale.set(1, 1, 1);
                if (this.rightEye) this.rightEye.scale.set(1, 1, 1);
            }, 400);
        }
        
        // Mouth opens in shock
        if (this.mouth) {
            this.mouth.scale.set(1.5, 2, 1);
            setTimeout(() => {
                if (this.mouth) this.mouth.scale.set(1, 1, 1);
            }, 400);
        }
        
        // Add MUCH MORE spinning effect if hit hard
        const spinForce = new CANNON.Vec3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 8
        );
        this.body.angularVelocity.vadd(spinForce, this.body.angularVelocity);
    }
    
    dropkick(target) {
        // VERY EXAGGERATED Crouch/wind-up animation first (Gang Beasts style telegraph)
        if (this.leftLeg && this.rightLeg) {
            this.leftLeg.rotation.x = -0.8; // Deep crouch
            this.rightLeg.rotation.x = -0.8;
            this.leftLeg.position.y = -1.0;
            this.rightLeg.position.y = -1.0;
        }
        
        // Squat down the whole body
        this.body.position.y -= 0.5;
        
        // Arms wind up
        if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.x = -1.5;
            this.rightArm.rotation.x = -1.5;
        }
        
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // HUGE jump and dramatic launch
            this.body.velocity.y = 18; // Much higher jump for more air time
            
            const direction = new CANNON.Vec3();
            direction.copy(target.body.position);
            direction.vsub(this.body.position);
            direction.y = 0;
            direction.normalize();
            
            // Apply MUCH STRONGER force to self for dramatic forward momentum
            const selfForce = direction.scale(400);
            this.body.applyImpulse(selfForce, this.body.position);
            
            // FULL LEG EXTENSION for kick animation (very visible)
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = Math.PI / 2; // Full extension
                this.rightLeg.rotation.x = Math.PI / 2;
                this.leftLeg.position.y = -0.8;
                this.rightLeg.position.y = -0.8;
                
                // Feet point forward
                if (this.leftFoot) this.leftFoot.rotation.x = -Math.PI / 3;
                if (this.rightFoot) this.rightFoot.rotation.x = -Math.PI / 3;
            }
            
            // Arms windmill for balance (super comedic flying pose)
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.x = -1.5;
                this.rightArm.rotation.x = -1.5;
                this.leftArm.rotation.z = Math.PI / 6;
                this.rightArm.rotation.z = -Math.PI / 6;
            }
            
            // Spinning during flight for comedy
            this.body.angularVelocity.y = 3;
            
            // Apply force to target if close enough (mid-air collision)
            setTimeout(() => {
                if (!this.isAlive) return;
                
                const distance = this.body.position.distanceTo(target.body.position);
                if (distance < 5.0) {
                    const targetForce = direction.scale(700 * this.strength); // MUCH MORE powerful kick
                    targetForce.y = 250; // HUGE vertical launch
                    target.body.applyImpulse(targetForce, target.body.position);
                    target.takeDamage(35 * this.strength);
                    target.reactToHit(direction);
                    
                    // Add MASSIVE spin to target for comedy
                    target.body.angularVelocity.set(
                        (Math.random() - 0.5) * 20,
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 20
                    );
                }
                
                // Return limbs to normal position
                setTimeout(() => {
                    if (this.leftLeg) {
                        this.leftLeg.rotation.x = 0;
                        this.leftLeg.position.y = -1.5;
                        if (this.leftFoot) this.leftFoot.rotation.x = 0;
                    }
                    if (this.rightLeg) {
                        this.rightLeg.rotation.x = 0;
                        this.rightLeg.position.y = -1.5;
                        if (this.rightFoot) this.rightFoot.rotation.x = 0;
                    }
                    if (this.leftArm) {
                        this.leftArm.rotation.x = 0;
                        this.leftArm.rotation.z = Math.PI / 4;
                    }
                    if (this.rightArm) {
                        this.rightArm.rotation.x = 0;
                        this.rightArm.rotation.z = -Math.PI / 4;
                    }
                }, 400);
            }, 300); // More time in air
        }, 300); // Longer wind-up for visibility
    }
    
    takeDamage(amount) {
        if (this.isKnockedOut) return;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.knockout();
        }
    }
    
    knockout() {
        this.isKnockedOut = true;
        this.knockoutTimer = 180 + Math.random() * 120; // 3-5 seconds
        this.wakeupProgress = 0;
        this.mesh.material.transparent = true;
        this.changeAIState('idle');
    }
    
    wakeUp() {
        this.isKnockedOut = false;
        this.health = 50;
        this.wakeupProgress = 0;
        this.mesh.material.opacity = 1;
        this.mesh.material.transparent = false;
        
        if (this.isGrabbed) {
            // Break free from grab
            this.breakFree();
        }
        
        this.changeAIState('seeking');
    }
    
    grabCharacter(target) {
        if (this.isGrabbing || target.isGrabbed) return;
        
        this.isGrabbing = true;
        this.grabbedTarget = target;
        target.isGrabbed = true;
        this.changeAIState('grabbing');
    }
    
    updateGrab() {
        if (!this.grabbedTarget || !this.grabbedTarget.isAlive) {
            this.releaseGrab();
            return;
        }
        
        if (!this.grabbedTarget.isKnockedOut) {
            // Target woke up and broke free
            this.releaseGrab();
            return;
        }
        
        // Carry animation - sway the grabbed character (Party Animals style)
        const time = Date.now() * 0.005;
        const swayX = Math.sin(time) * 0.8;
        const swayZ = Math.cos(time * 0.7) * 0.8;
        const swayY = Math.abs(Math.sin(time * 0.5)) * 0.3;
        
        // Move grabbed character with this character with sway effect
        const grabOffset = new CANNON.Vec3(swayX, 0.5 + swayY, 1.5 + swayZ);
        const worldOffset = this.body.quaternion.vmult(grabOffset);
        const targetPos = this.body.position.vadd(worldOffset);
        
        this.grabbedTarget.body.position.copy(targetPos);
        this.grabbedTarget.body.velocity.scale(0.3); // More dampening
        
        // Grabber arm animation - holding pose
        if (this.rightArm) {
            this.rightArm.rotation.z = -Math.PI / 3;
            this.rightArm.rotation.x = 0.5;
            this.rightArm.position.x = 1.2;
        }
        if (this.leftArm) {
            this.leftArm.rotation.z = Math.PI / 3;
            this.leftArm.rotation.x = 0.5;
            this.leftArm.position.x = -1.2;
        }
        
        // Move towards platform edge (evil carry animation)
        const platformEdge = new CANNON.Vec3(
            this.body.position.x > 0 ? 15 : -15,
            -3,
            this.body.position.z > 0 ? 15 : -15
        );
        
        this.moveTowards(platformEdge);
        
        // Check if at edge
        const distanceToEdge = Math.sqrt(
            Math.pow(this.body.position.x, 2) + Math.pow(this.body.position.z, 2)
        );
        
        if (distanceToEdge > 13) {
            // Dramatic throw animation
            this.throwCharacter();
        }
    }
    
    throwCharacter() {
        if (!this.grabbedTarget) return;
        
        // Wind-up animation for throw (Gang Beasts style)
        if (this.rightArm) {
            this.rightArm.rotation.x = -1.5;
        }
        
        setTimeout(() => {
            if (!this.grabbedTarget) return;
            
            // Apply strong throwing force
            const throwDirection = new CANNON.Vec3(
                this.body.position.x > 0 ? 1.5 : -1.5,
                -0.3,
                this.body.position.z > 0 ? 1.5 : -1.5
            );
            throwDirection.normalize();
            
            const throwForce = throwDirection.scale(500); // Stronger throw
            this.grabbedTarget.body.applyImpulse(throwForce, this.grabbedTarget.body.position);
            
            // Add spin for comedic effect
            this.grabbedTarget.body.angularVelocity.set(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 15
            );
            
            // Throwing animation follow-through
            if (this.rightArm) {
                this.rightArm.rotation.x = 1;
                setTimeout(() => {
                    if (this.rightArm) {
                        this.rightArm.rotation.x = 0;
                        this.rightArm.rotation.z = -Math.PI / 4;
                        this.rightArm.position.x = 1;
                    }
                }, 300);
            }
            if (this.leftArm) {
                this.leftArm.rotation.x = 0;
                this.leftArm.rotation.z = Math.PI / 4;
                this.leftArm.position.x = -1;
            }
            
            this.releaseGrab();
        }, 200);
    }
    
    releaseGrab() {
        if (this.grabbedTarget) {
            this.grabbedTarget.isGrabbed = false;
            this.grabbedTarget = null;
        }
        this.isGrabbing = false;
        this.changeAIState('seeking');
    }
    
    breakFree() {
        // Apply force to push away from grabber
        const escapeForce = new CANNON.Vec3(
            (Math.random() - 0.5) * 200,
            150,
            (Math.random() - 0.5) * 200
        );
        this.body.applyImpulse(escapeForce, this.body.position);
        
        this.isGrabbed = false;
    }
    
    applyPowerBoost() {
        this.strength = 2.0;
        this.speed = 1.5;
        this.health = Math.min(100, this.health + 50);
        
        // Visual effect - glow
        this.mesh.material.emissive = new THREE.Color(0xFFD700);
        this.mesh.material.emissiveIntensity = 0.5;
        
        // Reset after duration
        setTimeout(() => {
            this.strength = 1.0;
            this.speed = 1.0;
            this.mesh.material.emissive = new THREE.Color(0x000000);
            this.mesh.material.emissiveIntensity = 0;
        }, 10000);
    }
    
    animateLimbs() {
        // EXTREMELY ENHANCED limb animations for VERY VISIBLE movement (Party Animals style)
        const speed = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x +
            this.body.velocity.z * this.body.velocity.z
        );
        
        if (speed > 0.3 && !this.isKnockedOut && !this.isStunned) {
            // HILARIOUS running animation with EXTREME exaggerated movements
            const time = Date.now() * 0.025; // Faster for more comedy
            const intensity = Math.min(speed / 3, 3.0); // Much higher intensity
            
            if (this.leftLeg) {
                // SUPER HIGH knee lifts (almost to chest)
                const legSwing = Math.sin(time) * 1.8 * intensity;
                this.leftLeg.rotation.x = legSwing;
                this.leftLeg.rotation.z = Math.sin(time * 0.5) * 0.4; // More wobble
                
                // DRAMATIC knee lift position change
                if (Math.sin(time) > 0.2) {
                    this.leftLeg.position.y = -0.5; // Way up near torso
                } else {
                    this.leftLeg.position.y = -1.5;
                }
                
                // Foot flaps wildly
                if (this.leftFoot) {
                    this.leftFoot.rotation.x = Math.sin(time) * 0.8;
                }
            }
            if (this.rightLeg) {
                const legSwing = Math.sin(time + Math.PI) * 1.8 * intensity;
                this.rightLeg.rotation.x = legSwing;
                this.rightLeg.rotation.z = Math.sin(time * 0.5 + Math.PI) * 0.4;
                
                if (Math.sin(time + Math.PI) > 0.2) {
                    this.rightLeg.position.y = -0.5; // Way up
                } else {
                    this.rightLeg.position.y = -1.5;
                }
                
                if (this.rightFoot) {
                    this.rightFoot.rotation.x = Math.sin(time + Math.PI) * 0.8;
                }
            }
            
            // WILDLY PUMPING arms while running (like Naruto run but backwards)
            if (this.leftArm && !this.isGrabbing) {
                this.leftArm.rotation.x = Math.sin(time + Math.PI) * 2.0 * intensity; // MASSIVE arm swing
                this.leftArm.rotation.z = Math.PI / 4 + Math.sin(time * 0.3) * 0.6; // Huge sway
                this.leftArm.position.z = Math.sin(time + Math.PI) * 0.6; // Way forward-back
                
                // Hand flaps
                if (this.leftHand) {
                    this.leftHand.rotation.x = Math.sin(time * 2) * 1.0;
                }
            }
            if (this.rightArm && !this.isGrabbing) {
                this.rightArm.rotation.x = Math.sin(time) * 2.0 * intensity; // MASSIVE arm swing
                this.rightArm.rotation.z = -Math.PI / 4 - Math.sin(time * 0.3) * 0.6;
                this.rightArm.position.z = Math.sin(time) * 0.6;
                
                if (this.rightHand) {
                    this.rightHand.rotation.x = Math.sin(time * 2 + Math.PI) * 1.0;
                }
            }
            
            // EXTREME head bobbing and turning while running
            if (this.head) {
                this.head.rotation.y = Math.sin(time * 0.8) * 0.5; // Big head turns
                this.head.position.y = 2.0 + Math.abs(Math.sin(time * 2.5)) * 0.4; // HUGE bobbing
                this.head.rotation.x = Math.sin(time * 1.5) * 0.2; // Nod
                this.head.rotation.z = Math.sin(time * 0.6) * 0.25; // Head wobble
            }
            
            // Eyes dart around frantically when running
            if (this.leftEye && this.rightEye) {
                const eyeTime = Date.now() * 0.01;
                this.leftEye.position.x = -0.25 + Math.sin(eyeTime) * 0.1;
                this.rightEye.position.x = 0.25 + Math.sin(eyeTime) * 0.1;
            }
            
        } else if (!this.isKnockedOut && !this.isStunned) {
            // MUCH MORE ACTIVE idle animation - breathing and fidgeting
            const time = Date.now() * 0.005;
            
            // Shifting weight from foot to foot
            if (this.leftArm && !this.isGrabbing) {
                this.leftArm.rotation.z = Math.PI / 4 + Math.sin(time) * 0.25;
                this.leftArm.rotation.x = Math.sin(time * 0.7) * 0.3;
                this.leftArm.position.z = 0;
                if (this.leftHand) {
                    this.leftHand.rotation.x = Math.sin(time * 1.2) * 0.3;
                }
            }
            if (this.rightArm && !this.isGrabbing) {
                this.rightArm.rotation.z = -Math.PI / 4 - Math.sin(time + Math.PI) * 0.25;
                this.rightArm.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.3;
                this.rightArm.position.z = 0;
                if (this.rightHand) {
                    this.rightHand.rotation.x = Math.sin(time * 1.2 + Math.PI) * 0.3;
                }
            }
            
            // Head looking around curiously
            if (this.head) {
                this.head.rotation.y = Math.sin(time * 0.5) * 0.6; // Big head turns
                this.head.rotation.x = Math.sin(time * 0.3) * 0.15;
                this.head.position.y = 2.0 + Math.sin(time * 1.2) * 0.12; // Breathing
                this.head.rotation.z = Math.sin(time * 0.4) * 0.1;
            }
            
            // Eyes blink occasionally
            if (this.leftEye && this.rightEye && Math.random() < 0.01) {
                this.leftEye.scale.y = 0.1;
                this.rightEye.scale.y = 0.1;
                setTimeout(() => {
                    if (this.leftEye) this.leftEye.scale.y = 1;
                    if (this.rightEye) this.rightEye.scale.y = 1;
                }, 100);
            }
            
            // Visible weight shifting in legs
            if (this.leftLeg) {
                this.leftLeg.rotation.x = Math.sin(time * 0.4) * 0.2;
                this.leftLeg.position.y = -1.5;
            }
            if (this.rightLeg) {
                this.rightLeg.rotation.x = Math.sin(time * 0.4 + Math.PI) * 0.2;
                this.rightLeg.position.y = -1.5;
            }
        }
        
        // MUCH MORE DRAMATIC ragdoll physics for knocked out characters
        if (this.isKnockedOut && !this.isGrabbed) {
            // Make limbs VERY floppy with exaggerated physics-based wobble
            const wobble = Math.sin(Date.now() * 0.03) * 2.0; // Much stronger
            const wobble2 = Math.cos(Date.now() * 0.025) * 2.0;
            
            if (this.leftArm) {
                this.leftArm.rotation.z = wobble * 2.0; // Super dramatic
                this.leftArm.rotation.x = wobble2 * 1.8;
                if (this.leftHand) this.leftHand.rotation.x = wobble * 1.5;
            }
            if (this.rightArm) {
                this.rightArm.rotation.z = -wobble * 2.0;
                this.rightArm.rotation.x = -wobble2 * 1.8;
                if (this.rightHand) this.rightHand.rotation.x = -wobble * 1.5;
            }
            if (this.leftLeg) {
                this.leftLeg.rotation.x = wobble2 * 1.5;
                this.leftLeg.rotation.z = wobble * 0.8;
                if (this.leftFoot) this.leftFoot.rotation.x = wobble * 0.8;
            }
            if (this.rightLeg) {
                this.rightLeg.rotation.x = -wobble2 * 1.5;
                this.rightLeg.rotation.z = -wobble * 0.8;
                if (this.rightFoot) this.rightFoot.rotation.x = -wobble * 0.8;
            }
            
            // Head lolling dramatically - VERY OBVIOUSLY unconscious
            if (this.head) {
                this.head.rotation.x = wobble * 1.2;
                this.head.rotation.y = wobble2 * 1.5;
                this.head.rotation.z = wobble * 0.8;
            }
            
            // Eyes rolled back or closed
            if (this.leftEye && this.rightEye) {
                this.leftEye.position.y = 0.05; // Rolled up
                this.rightEye.position.y = 0.05;
            }
            
            // Mouth hanging open
            if (this.mouth) {
                this.mouth.scale.set(1.2, 1.5, 1);
                this.mouth.rotation.z = wobble * 0.3;
            }
        }
    }
    
    die() {
        this.isAlive = false;
        
        // Remove from scene
        this.game.scene.remove(this.mesh);
        this.game.world.removeBody(this.body);
        
        // Remove from game characters array
        const index = this.game.characters.indexOf(this);
        if (index > -1) {
            this.game.characters.splice(index, 1);
        }
    }
    
    destroy() {
        this.die();
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
