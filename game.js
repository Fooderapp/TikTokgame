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
        
        // Viewport settings for mobile (portrait)
        this.width = 1080;
        this.height = 1920;
        
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
        this.camera.position.set(0, 25, 45); // Higher and better angle
        this.camera.lookAt(0, -2, 0); // Look at platform level
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
        let cameraRotation = { x: 0.4, y: 0 }; // Better starting angle
        let cameraDistance = 45; // Match new camera distance
        
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
            this.camera.position.y = Math.sin(cameraRotation.x) * cameraDistance + 15; // Higher base height
            this.camera.position.z = Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x) * cameraDistance;
            this.camera.lookAt(0, -2, 0); // Look at platform level
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
        
        // Main body (torso) - using box geometry
        const bodyGeometry = new THREE.BoxGeometry(1.5, 2, 1);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.castShadow = true;
        this.game.scene.add(this.mesh);
        
        // Spawn position based on team - ON the platform, further from edges
        const spawnX = this.team === 'blue' ? -8 : 8;
        const spawnZ = (Math.random() - 0.5) * 6; // Narrower Z range
        const spawnY = -2; // Just above platform surface (platform top is at -4, character radius 1.2)
        
        // Physics body - use cylinder for upright standing (Gang Beasts style)
        // This prevents rolling and keeps characters standing upright
        const bodyShape = new CANNON.Cylinder(0.6, 0.6, 2.4, 12);
        this.body = new CANNON.Body({
            mass: 5,
            shape: bodyShape,
            position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
            linearDamping: 0.5, // More damping for controlled movement
            angularDamping: 0.9, // High angular damping to stay upright
            fixedRotation: false // Allow rotation but heavily damped
        });
        
        // Add friction for better ground contact
        this.body.material = new CANNON.Material();
        this.body.material.friction = 0.9;
        this.body.material.restitution = 0.2; // Slightly bouncy for comedic effect
        
        this.game.world.addBody(this.body);
        
        // Track impact state for reactions
        this.lastHitTime = 0;
        this.isStunned = false;
        
        // Add head
        const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBAC });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 1.5;
        this.mesh.add(this.head);
        
        // Add arms using cylinders
        const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const armMaterial = new THREE.MeshPhongMaterial({ color: color });
        
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-1, 0.5, 0);
        this.leftArm.rotation.z = Math.PI / 4;
        this.mesh.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(1, 0.5, 0);
        this.rightArm.rotation.z = -Math.PI / 4;
        this.mesh.add(this.rightArm);
        
        // Add legs using cylinders
        const legGeometry = new THREE.CylinderGeometry(0.35, 0.35, 1.5, 8);
        const legMaterial = new THREE.MeshPhongMaterial({ color: color });
        
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.5, -1.5, 0);
        this.mesh.add(this.leftLeg);
        
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.5, -1.5, 0);
        this.mesh.add(this.rightLeg);
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
        
        // Keep character upright (Gang Beasts style stabilization)
        if (!this.isKnockedOut && !this.isStunned) {
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
        
        // Cooldown management
        if (this.actionCooldown > 0) {
            this.actionCooldown--;
        }
        
        // Animate limbs
        this.animateLimbs();
    }
    
    stabilizeUpright() {
        // Apply corrective torque to keep character standing upright (like Gang Beasts)
        const targetUp = new CANNON.Vec3(0, 1, 0);
        const currentUp = new CANNON.Vec3(0, 1, 0);
        this.body.quaternion.vmult(currentUp, currentUp);
        
        // Calculate angle from upright
        const dot = currentUp.dot(targetUp);
        if (dot < 0.95) {
            // Apply corrective angular velocity
            const correctionAxis = new CANNON.Vec3();
            currentUp.cross(targetUp, correctionAxis);
            correctionAxis.normalize();
            
            const correctionStrength = (1 - dot) * 5; // Stronger correction when more tilted
            const correction = correctionAxis.scale(correctionStrength);
            
            this.body.angularVelocity.x = correction.x;
            this.body.angularVelocity.z = correction.z;
            // Keep some y rotation for turning
        }
        
        // Limit angular velocity to prevent spinning
        const maxAngularVel = 3;
        if (this.body.angularVelocity.length() > maxAngularVel) {
            this.body.angularVelocity.normalize();
            this.body.angularVelocity.scale(maxAngularVel, this.body.angularVelocity);
        }
    }
    
    animateStruggle() {
        // Flailing animation when grabbed (Party Animals style)
        const time = Date.now() * 0.02;
        const intensity = 0.8;
        
        if (this.leftArm) {
            this.leftArm.rotation.x = Math.sin(time * 1.5) * intensity;
            this.leftArm.rotation.z = Math.PI / 4 + Math.cos(time * 1.2) * intensity;
        }
        if (this.rightArm) {
            this.rightArm.rotation.x = Math.sin(time * 1.3 + Math.PI) * intensity;
            this.rightArm.rotation.z = -Math.PI / 4 + Math.cos(time * 1.4) * intensity;
        }
        if (this.leftLeg) {
            this.leftLeg.rotation.x = Math.sin(time * 1.1) * 0.5;
        }
        if (this.rightLeg) {
            this.rightLeg.rotation.x = Math.sin(time * 1.1 + Math.PI) * 0.5;
        }
        if (this.head) {
            this.head.rotation.y = Math.sin(time * 0.8) * 0.3;
        }
    }
    
    animateStagger() {
        // Stumbling animation after being hit (comedic effect)
        const time = Date.now() - this.lastHitTime;
        const t = time / 800; // 0 to 1 over stun duration
        const wobble = Math.sin(time * 0.03) * (1 - t) * 0.6;
        
        if (this.leftArm) {
            this.leftArm.rotation.z = Math.PI / 4 + wobble;
            this.leftArm.rotation.x = wobble * 0.5;
        }
        if (this.rightArm) {
            this.rightArm.rotation.z = -Math.PI / 4 - wobble;
            this.rightArm.rotation.x = -wobble * 0.5;
        }
        if (this.head) {
            this.head.rotation.x = wobble * 0.3;
            this.head.rotation.z = wobble * 0.4;
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
            // Add slight random movement to make it more dynamic and unpredictable
            if (this.aiTimer % 25 === 0) {
                const circleDirection = new CANNON.Vec3(
                    (Math.random() - 0.5) * 50,
                    0,
                    (Math.random() - 0.5) * 50
                );
                this.body.applyForce(circleDirection, this.body.position);
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
        
        // If too close to edge, move back toward center
        if (distFromCenter > 12) {
            const toCenterDirection = new CANNON.Vec3(
                -this.body.position.x,
                0,
                -this.body.position.z
            );
            toCenterDirection.normalize();
            const force = toCenterDirection.scale(100 * this.speed);
            this.body.applyForce(force, this.body.position);
            return;
        }
        
        const direction = new CANNON.Vec3();
        direction.copy(targetPos);
        direction.vsub(this.body.position);
        direction.y = 0; // Don't move vertically
        direction.normalize();
        
        const force = direction.scale(100 * this.speed); // Increased force for more responsiveness
        this.body.applyForce(force, this.body.position);
        
        // Limit speed
        const maxSpeed = 10 * this.speed; // Increased max speed
        const velocity = this.body.velocity;
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (horizontalSpeed > maxSpeed) {
            const scale = maxSpeed / horizontalSpeed;
            this.body.velocity.x *= scale;
            this.body.velocity.z *= scale;
        }
        
        // Add upward stabilization if character is tilted
        if (this.body.position.y < -3.5) {
            this.body.velocity.y = Math.max(this.body.velocity.y, 0);
        }
    }
    
    punch(target) {
        // Wind-up telegraph (Gang Beasts style)
        if (this.rightArm) {
            this.rightArm.rotation.z = -Math.PI / 6;
            this.rightArm.rotation.x = -0.3;
        }
        
        // Short delay for wind-up visibility
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // Apply force to target with better direction calculation
            const direction = new CANNON.Vec3();
            direction.copy(target.body.position);
            direction.vsub(this.body.position);
            direction.y = 0.3; // Upward angle for dramatic effect
            direction.normalize();
            
            const force = direction.scale(300 * this.strength); // Stronger impact
            target.body.applyImpulse(force, target.body.position);
            
            // Apply impact reaction to target
            target.reactToHit(direction);
            
            // Damage target
            target.takeDamage(20 * this.strength);
            
            // Punch extension animation
            if (this.rightArm) {
                this.rightArm.rotation.z = -Math.PI / 2;
                this.rightArm.position.x = 1.4;
                this.rightArm.rotation.x = 0;
                
                setTimeout(() => {
                    if (this.rightArm) {
                        // Return to normal
                        this.rightArm.rotation.z = -Math.PI / 4;
                        this.rightArm.position.x = 1;
                        this.rightArm.rotation.x = 0;
                    }
                }, 150);
            }
            
            // Add slight recoil to puncher
            const recoil = direction.scale(-15);
            this.body.applyImpulse(recoil, this.body.position);
        }, 150);
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
        // Add impact reaction animation (Party Animals/Gang Beasts style)
        this.lastHitTime = Date.now();
        this.isStunned = true;
        
        // Flail arms on impact (comedic effect)
        if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.x = 1.5;
            this.rightArm.rotation.x = 1.5;
            
            setTimeout(() => {
                if (this.leftArm) this.leftArm.rotation.x = 0;
                if (this.rightArm) this.rightArm.rotation.x = 0;
            }, 300);
        }
        
        // Add spinning effect if hit hard
        const spinForce = new CANNON.Vec3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 3
        );
        this.body.angularVelocity.vadd(spinForce, this.body.angularVelocity);
    }
    
    dropkick(target) {
        // Crouch/wind-up animation first (Gang Beasts style telegraph)
        if (this.leftLeg && this.rightLeg) {
            this.leftLeg.rotation.x = -0.5;
            this.rightLeg.rotation.x = -0.5;
            this.leftLeg.position.y = -1.3;
            this.rightLeg.position.y = -1.3;
        }
        
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // Jump and apply force with dramatic launch
            this.body.velocity.y = 12; // Higher jump for more air time
            
            const direction = new CANNON.Vec3();
            direction.copy(target.body.position);
            direction.vsub(this.body.position);
            direction.y = 0;
            direction.normalize();
            
            // Apply force to self for forward momentum
            const selfForce = direction.scale(250);
            this.body.applyImpulse(selfForce, this.body.position);
            
            // Extend legs for kick animation
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = Math.PI / 3;
                this.rightLeg.rotation.x = Math.PI / 3;
                this.leftLeg.position.y = -1.2;
                this.rightLeg.position.y = -1.2;
            }
            
            // Arms back for balance (comedic flying pose)
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.x = -1;
                this.rightArm.rotation.x = -1;
            }
            
            // Apply force to target if close enough (mid-air collision)
            setTimeout(() => {
                if (!this.isAlive) return;
                
                const distance = this.body.position.distanceTo(target.body.position);
                if (distance < 4.5) {
                    const targetForce = direction.scale(450 * this.strength); // More powerful kick
                    targetForce.y = 150; // High launch
                    target.body.applyImpulse(targetForce, target.body.position);
                    target.takeDamage(35 * this.strength);
                    target.reactToHit(direction);
                    
                    // Add dramatic spin to target
                    target.body.angularVelocity.set(
                        (Math.random() - 0.5) * 12,
                        (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 12
                    );
                }
                
                // Return limbs to normal position
                setTimeout(() => {
                    if (this.leftLeg) {
                        this.leftLeg.rotation.x = 0;
                        this.leftLeg.position.y = -1.5;
                    }
                    if (this.rightLeg) {
                        this.rightLeg.rotation.x = 0;
                        this.rightLeg.position.y = -1.5;
                    }
                    if (this.leftArm) this.leftArm.rotation.x = 0;
                    if (this.rightArm) this.rightArm.rotation.x = 0;
                }, 300);
            }, 200);
        }, 200);
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
        // Enhanced limb animations for more comedic effect (Party Animals style)
        const speed = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x +
            this.body.velocity.z * this.body.velocity.z
        );
        
        if (speed > 0.5 && !this.isKnockedOut && !this.isStunned) {
            // Running animation with exaggerated movements
            const time = Date.now() * 0.01; // Faster animation
            const intensity = Math.min(speed / 5, 1.5); // Scale with speed
            
            if (this.leftLeg) {
                this.leftLeg.rotation.x = Math.sin(time) * 0.8 * intensity;
                this.leftLeg.rotation.z = Math.sin(time * 0.5) * 0.15;
                // High knee lift when running fast
                if (Math.sin(time) > 0.5) {
                    this.leftLeg.position.y = -1.3;
                } else {
                    this.leftLeg.position.y = -1.5;
                }
            }
            if (this.rightLeg) {
                this.rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.8 * intensity;
                this.rightLeg.rotation.z = Math.sin(time * 0.5 + Math.PI) * 0.15;
                if (Math.sin(time + Math.PI) > 0.5) {
                    this.rightLeg.position.y = -1.3;
                } else {
                    this.rightLeg.position.y = -1.5;
                }
            }
            
            // Pumping arms while running (comedic sprint)
            if (this.leftArm && !this.isGrabbing) {
                this.leftArm.rotation.x = Math.sin(time + Math.PI) * 0.6 * intensity;
                this.leftArm.rotation.z = Math.PI / 4 + Math.sin(time * 0.3) * 0.2;
                this.leftArm.position.z = Math.sin(time + Math.PI) * 0.2;
            }
            if (this.rightArm && !this.isGrabbing) {
                this.rightArm.rotation.x = Math.sin(time) * 0.6 * intensity;
                this.rightArm.rotation.z = -Math.PI / 4 - Math.sin(time * 0.3) * 0.2;
                this.rightArm.position.z = Math.sin(time) * 0.2;
            }
            
            // Head bobbing while running
            if (this.head) {
                this.head.rotation.y = Math.sin(time * 0.7) * 0.15;
                this.head.position.y = 1.5 + Math.abs(Math.sin(time * 2)) * 0.1;
            }
        } else if (!this.isKnockedOut && !this.isStunned) {
            // Idle animation - breathing and fidgeting (Gang Beasts style)
            const time = Date.now() * 0.002;
            
            // Gentle arm sway
            if (this.leftArm && !this.isGrabbing) {
                this.leftArm.rotation.z = Math.PI / 4 + Math.sin(time) * 0.08;
                this.leftArm.rotation.x = Math.sin(time * 0.7) * 0.1;
                this.leftArm.position.z = 0;
            }
            if (this.rightArm && !this.isGrabbing) {
                this.rightArm.rotation.z = -Math.PI / 4 - Math.sin(time + Math.PI) * 0.08;
                this.rightArm.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.1;
                this.rightArm.position.z = 0;
            }
            
            // Head looking around (curious behavior)
            if (this.head) {
                this.head.rotation.y = Math.sin(time * 0.5) * 0.2;
                this.head.rotation.x = Math.sin(time * 0.3) * 0.05;
                this.head.position.y = 1.5 + Math.sin(time * 0.8) * 0.03; // Breathing
            }
            
            // Subtle leg shifting (weight transfer)
            if (this.leftLeg) {
                this.leftLeg.rotation.x = Math.sin(time * 0.4) * 0.05;
                this.leftLeg.position.y = -1.5;
            }
            if (this.rightLeg) {
                this.rightLeg.rotation.x = Math.sin(time * 0.4 + Math.PI) * 0.05;
                this.rightLeg.position.y = -1.5;
            }
        }
        
        // Enhanced ragdoll physics for knocked out characters
        if (this.isKnockedOut && !this.isGrabbed) {
            // Make limbs loose and floppy with physics-based wobble
            const wobble = Math.sin(Date.now() * 0.015);
            const wobble2 = Math.cos(Date.now() * 0.012);
            
            if (this.leftArm) {
                this.leftArm.rotation.z = wobble * 1.2;
                this.leftArm.rotation.x = wobble2 * 0.8;
            }
            if (this.rightArm) {
                this.rightArm.rotation.z = -wobble * 1.2;
                this.rightArm.rotation.x = -wobble2 * 0.8;
            }
            if (this.leftLeg) {
                this.leftLeg.rotation.x = wobble2 * 0.6;
                this.leftLeg.rotation.z = wobble * 0.3;
            }
            if (this.rightLeg) {
                this.rightLeg.rotation.x = -wobble2 * 0.6;
                this.rightLeg.rotation.z = -wobble * 0.3;
            }
            
            // Head lolling (unconscious)
            if (this.head) {
                this.head.rotation.x = wobble * 0.4;
                this.head.rotation.y = wobble2 * 0.5;
                this.head.rotation.z = wobble * 0.3;
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
        game.renderer.setSize(window.innerWidth, window.innerHeight);
        game.camera.aspect = window.innerWidth / window.innerHeight;
        game.camera.updateProjectionMatrix();
    }
});
