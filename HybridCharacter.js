// Hybrid Character System - Combining best of both worlds
// Self-balancing capsule torso + ragdoll arms + animated legs
// Based on Gang Beasts and Party Animals mechanics

class HybridCharacter {
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
        this.powerBoostTimer = 0;
        
        // Animation state
        this.currentAnimation = 'idle';
        this.animationTime = 0;
        this.legPhase = 0;
        
        // Attack timers (frame-based)
        this.punchTimer = 0;
        this.kickTimer = 0;
        this.punchHitPos = null;
        this.kickDirection = null;
        
        // Physics bodies - organized by function
        this.bodies = {};
        this.constraints = [];
        this.meshes = {};
        
        // Root group for visual
        this.rootGroup = new THREE.Group();
        this.game.scene.add(this.rootGroup);
        
        // Create the character
        this.createHybridCharacter();
        this.setupAI();
    }
    
    createHybridCharacter() {
        const color = this.team === 'blue' ? 0x4A90E2 : 0xE24A4A;
        const spawnX = this.team === 'blue' ? -8 : 8;
        const spawnZ = 0;
        const spawnY = 0; // Spawn on ground level (-4 is platform, + 1.5 for height = -2.5, but visual offset)
        
        // === SELF-BALANCING CAPSULE (Torso + Hips) ===
        // This is the main body that stays balanced
        const capsuleShape = new CANNON.Cylinder(0.4, 0.4, 1.8, 12);
        const capsuleBody = new CANNON.Body({
            mass: 10, // Increased mass for better ground contact
            shape: capsuleShape,
            position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
            linearDamping: 0.5, // Increased damping to prevent sliding
            angularDamping: 0.95 // Much higher to prevent spinning
        });
        capsuleBody.material = new CANNON.Material();
        capsuleBody.material.friction = 1.0; // Maximum friction for no sliding
        capsuleBody.material.restitution = 0.0; // No bounce
        this.game.world.addBody(capsuleBody);
        this.bodies.torso = capsuleBody;
        this.body = capsuleBody; // Main body reference
        
        // Visual for torso capsule
        const torsoGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12);
        const torsoMat = new THREE.MeshPhongMaterial({ color: color });
        const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
        torsoMesh.castShadow = true;
        this.rootGroup.add(torsoMesh);
        this.meshes.torso = torsoMesh;
        
        // === HEAD (attached to capsule) ===
        const headShape = new CANNON.Sphere(0.35);
        const headBody = new CANNON.Body({
            mass: 1.2, // Reduced mass for less momentum
            shape: headShape,
            position: new CANNON.Vec3(spawnX, spawnY + 1.3, spawnZ),
            linearDamping: 0.8, // Much higher damping for stability
            angularDamping: 0.95 // Very high to prevent head spinning
        });
        this.game.world.addBody(headBody);
        this.bodies.head = headBody;
        
        // Visual head
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const skinMat = new THREE.MeshPhongMaterial({ color: 0xFFDBAC });
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headMesh.castShadow = true;
        this.rootGroup.add(headMesh);
        this.meshes.head = headMesh;
        
        // Add eyes
        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 0.1, 0.3);
        rightEye.position.set(0.12, 0.1, 0.3);
        headMesh.add(leftEye);
        headMesh.add(rightEye);
        
        // Connect head to torso with stronger constraint
        const headConstraint = new CANNON.PointToPointConstraint(
            capsuleBody,
            new CANNON.Vec3(0, 0.9, 0),
            headBody,
            new CANNON.Vec3(0, -0.3, 0)
        );
        headConstraint.collideConnected = false;
        this.game.world.addConstraint(headConstraint);
        this.constraints.push(headConstraint);
        
        // Add second constraint for head stability (prevents rotation)
        const headConstraint2 = new CANNON.PointToPointConstraint(
            capsuleBody,
            new CANNON.Vec3(0, 0.9, 0.2),
            headBody,
            new CANNON.Vec3(0, -0.2, 0.3)
        );
        headConstraint2.collideConnected = false;
        this.game.world.addConstraint(headConstraint2);
        this.constraints.push(headConstraint2);
        
        // === RAGDOLL ARMS (for realistic punching and grabbing) ===
        this.createRagdollArm('left', spawnX, spawnY, spawnZ, color, skinMat);
        this.createRagdollArm('right', spawnX, spawnY, spawnZ, color, skinMat);
        
        // === ANIMATED LEGS (visual only, movement driven by capsule) ===
        this.createAnimatedLegs(color);
    }
    
    createRagdollArm(side, x, y, z, color, skinMat) {
        const xOffset = side === 'left' ? -0.5 : 0.5;
        
        // Upper arm
        const upperArmShape = new CANNON.Box(new CANNON.Vec3(0.12, 0.4, 0.12));
        const upperArmBody = new CANNON.Body({
            mass: 0.6, // Reduced mass for easier control
            shape: upperArmShape,
            position: new CANNON.Vec3(x + xOffset, y + 0.5, z),
            linearDamping: 0.8, // Increased damping for stability
            angularDamping: 0.85 // Higher damping to reduce flailing
        });
        this.game.world.addBody(upperArmBody);
        this.bodies[`${side}UpperArm`] = upperArmBody;
        
        const upperArmGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
        const upperArmMat = new THREE.MeshPhongMaterial({ color: color });
        const upperArmMesh = new THREE.Mesh(upperArmGeo, upperArmMat);
        upperArmMesh.castShadow = true;
        this.rootGroup.add(upperArmMesh);
        this.meshes[`${side}UpperArm`] = upperArmMesh;
        
        // Shoulder constraint (ball joint)
        const shoulderConstraint = new CANNON.PointToPointConstraint(
            this.bodies.torso,
            new CANNON.Vec3(xOffset, 0.6, 0),
            upperArmBody,
            new CANNON.Vec3(0, 0.4, 0)
        );
        shoulderConstraint.collideConnected = false;
        this.game.world.addConstraint(shoulderConstraint);
        this.constraints.push(shoulderConstraint);
        
        // Forearm
        const forearmShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.35, 0.1));
        const forearmBody = new CANNON.Body({
            mass: 0.5, // Reduced mass
            shape: forearmShape,
            position: new CANNON.Vec3(x + xOffset, y - 0.3, z),
            linearDamping: 0.8, // Increased damping
            angularDamping: 0.85 // Higher damping
        });
        this.game.world.addBody(forearmBody);
        this.bodies[`${side}Forearm`] = forearmBody;
        
        const forearmGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
        forearmMesh.castShadow = true;
        this.rootGroup.add(forearmMesh);
        this.meshes[`${side}Forearm`] = forearmMesh;
        
        // Elbow constraint (hinge joint)
        const elbowConstraint = new CANNON.HingeConstraint(
            upperArmBody,
            forearmBody,
            {
                pivotA: new CANNON.Vec3(0, -0.4, 0),
                axisA: new CANNON.Vec3(1, 0, 0),
                pivotB: new CANNON.Vec3(0, 0.35, 0),
                axisB: new CANNON.Vec3(1, 0, 0)
            }
        );
        elbowConstraint.collideConnected = false;
        this.game.world.addConstraint(elbowConstraint);
        this.constraints.push(elbowConstraint);
        
        // Hand
        const handShape = new CANNON.Sphere(0.15);
        const handBody = new CANNON.Body({
            mass: 0.3, // Reduced mass
            shape: handShape,
            position: new CANNON.Vec3(x + xOffset, y - 1.0, z),
            linearDamping: 0.8, // Increased damping
            angularDamping: 0.85 // Higher damping
        });
        this.game.world.addBody(handBody);
        this.bodies[`${side}Hand`] = handBody;
        
        const handGeo = new THREE.SphereGeometry(0.15, 12, 12);
        const handMesh = new THREE.Mesh(handGeo, skinMat);
        handMesh.castShadow = true;
        this.rootGroup.add(handMesh);
        this.meshes[`${side}Hand`] = handMesh;
        
        // Wrist constraint
        const wristConstraint = new CANNON.PointToPointConstraint(
            forearmBody,
            new CANNON.Vec3(0, -0.35, 0),
            handBody,
            new CANNON.Vec3(0, 0, 0)
        );
        wristConstraint.collideConnected = false;
        this.game.world.addConstraint(wristConstraint);
        this.constraints.push(wristConstraint);
    }
    
    createAnimatedLegs(color) {
        // Legs are visual only - animated based on movement
        // They follow the capsule position but with walking animation
        
        const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.9, 12);
        const legMat = new THREE.MeshPhongMaterial({ color: color });
        
        // Left leg
        const leftUpperLeg = new THREE.Mesh(legGeo, legMat);
        leftUpperLeg.castShadow = true;
        this.rootGroup.add(leftUpperLeg);
        this.meshes.leftUpperLeg = leftUpperLeg;
        
        const leftLowerLeg = new THREE.Mesh(legGeo, legMat);
        leftLowerLeg.castShadow = true;
        this.rootGroup.add(leftLowerLeg);
        this.meshes.leftLowerLeg = leftLowerLeg;
        
        // Right leg
        const rightUpperLeg = new THREE.Mesh(legGeo, legMat);
        rightUpperLeg.castShadow = true;
        this.rootGroup.add(rightUpperLeg);
        this.meshes.rightUpperLeg = rightUpperLeg;
        
        const rightLowerLeg = new THREE.Mesh(legGeo, legMat);
        rightLowerLeg.castShadow = true;
        this.rootGroup.add(rightLowerLeg);
        this.meshes.rightLowerLeg = rightLowerLeg;
        
        // Feet
        const footGeo = new THREE.BoxGeometry(0.28, 0.2, 0.5);
        const leftFoot = new THREE.Mesh(footGeo, legMat);
        leftFoot.castShadow = true;
        this.rootGroup.add(leftFoot);
        this.meshes.leftFoot = leftFoot;
        
        const rightFoot = new THREE.Mesh(footGeo, legMat);
        rightFoot.castShadow = true;
        this.rootGroup.add(rightFoot);
        this.meshes.rightFoot = rightFoot;
    }
    
    setupAI() {
        this.aiThinkInterval = 30;
        this.aiThinkCounter = 0;
    }
    
    update(deltaTime) {
        // Update animation time
        this.animationTime += deltaTime;
        
        // Handle attack timers
        if (this.punchTimer > 0) {
            this.punchTimer--;
            if (this.punchTimer === 0 && this.punchHitPos && this.isAlive) {
                this.checkHit(this.punchHitPos, 2.0, 20);
                this.currentAnimation = 'idle';
                this.punchHitPos = null;
            }
        }
        
        if (this.kickTimer > 0) {
            this.kickTimer--;
            if (this.kickTimer === 0 && this.kickDirection && this.isAlive) {
                const kickPos = new CANNON.Vec3(
                    this.body.position.x + this.kickDirection.x * 1.5,
                    this.body.position.y,
                    this.body.position.z + this.kickDirection.z * 1.5
                );
                this.checkHit(kickPos, 2.5, 35);
                this.currentAnimation = 'idle';
                this.kickDirection = null;
            }
        }
        
        // Power boost timer
        if (this.powerBoostTimer > 0) {
            this.powerBoostTimer--;
            if (this.powerBoostTimer === 0) {
                this.strength = 1.0;
                this.speed = 1.0;
                this.removePowerEffect();
            }
        }
        
        // Knockout system
        if (this.isKnockedOut) {
            this.knockoutTimer--;
            
            if (this.isGrabbed) {
                this.wakeupProgress += 0.5;
            } else {
                this.wakeupProgress += 1.0;
            }
            
            if (this.wakeupProgress >= this.knockoutTimer || this.knockoutTimer <= 0) {
                this.wakeUp();
            }
            
            // In knockout, sync all visuals to physics
            this.syncAllMeshesToPhysics();
        } else if (this.isAlive) {
            // Active state - apply balance and AI
            this.applyBalanceForces();
            this.updateAI(deltaTime);
            this.updateAnimations(deltaTime);
            
            // Sync physics bodies to their positions
            this.syncAllMeshesToPhysics();
        }
        
        // Check if fallen off
        if (this.body.position.y < -40 && this.isAlive) {
            this.die();
        }
    }
    
    applyBalanceForces() {
        if (this.isKnockedOut) return;
        
        const torso = this.bodies.torso;
        
        // Ground contact detection - only apply upward force if on ground
        const isOnGround = torso.position.y < -2.5; // Platform is at -5, character bottom at ~-3.5
        
        // Keep capsule at proper height with gentle stabilization (not jumping)
        const targetHeight = -3.1; // Just above platform surface
        const heightDiff = targetHeight - torso.position.y;
        
        if (isOnGround && heightDiff > 0.1) {
            // Only apply force if significantly below target
            const upForce = heightDiff * 300 * this.speed;
            torso.applyForce(new CANNON.Vec3(0, upForce, 0), torso.position);
        } else if (heightDiff < -0.1) {
            // Apply downward force if too high (prevent jumping)
            const downForce = heightDiff * 200;
            torso.applyForce(new CANNON.Vec3(0, downForce, 0), torso.position);
        }
        
        // Limit vertical velocity to prevent jumping/bouncing
        if (torso.velocity.y > 2) {
            torso.velocity.y = 2;
        }
        
        // Strong angular damping to keep upright
        torso.angularVelocity.scale(0.3, torso.angularVelocity);
        
        // Actively correct rotation to stay upright
        const uprightQuat = new CANNON.Quaternion();
        uprightQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
        
        // Blend towards upright
        const blendFactor = 0.15; // Stronger correction
        torso.quaternion.x = torso.quaternion.x * (1 - blendFactor) + uprightQuat.x * blendFactor;
        torso.quaternion.z = torso.quaternion.z * (1 - blendFactor) + uprightQuat.z * blendFactor;
        torso.quaternion.normalize();
        
        // Apply strong arm damping and position correction when not attacking
        if (this.currentAnimation !== 'punching' && this.currentAnimation !== 'kicking') {
            // Stabilize arms by dampening angular velocity heavily
            ['leftUpperArm', 'rightUpperArm', 'leftForearm', 'rightForearm', 'leftHand', 'rightHand'].forEach(part => {
                if (this.bodies[part]) {
                    // Much stronger damping for idle arms
                    this.bodies[part].angularVelocity.scale(0.5, this.bodies[part].angularVelocity);
                    this.bodies[part].velocity.scale(0.7, this.bodies[part].velocity);
                }
            });
            
            // Apply gentle forces to keep arms near rest position
            const leftArm = this.bodies.leftUpperArm;
            const rightArm = this.bodies.rightUpperArm;
            if (leftArm && rightArm) {
                // Target position relative to torso
                const targetLeftPos = new CANNON.Vec3(
                    torso.position.x - 0.5,
                    torso.position.y + 0.3,
                    torso.position.z
                );
                const targetRightPos = new CANNON.Vec3(
                    torso.position.x + 0.5,
                    torso.position.y + 0.3,
                    torso.position.z
                );
                
                // Apply gentle return force
                const returnForce = 15;
                const leftDiff = new CANNON.Vec3();
                targetLeftPos.vsub(leftArm.position, leftDiff);
                leftArm.applyForce(leftDiff.scale(returnForce), leftArm.position);
                
                const rightDiff = new CANNON.Vec3();
                targetRightPos.vsub(rightArm.position, rightDiff);
                rightArm.applyForce(rightDiff.scale(returnForce), rightArm.position);
            }
        }
        
        // Keep head stable by applying forces to align with torso
        const head = this.bodies.head;
        if (head && this.currentAnimation !== 'knockout') {
            head.angularVelocity.scale(0.4, head.angularVelocity);
            head.velocity.scale(0.8, head.velocity);
        }
    }
    
    updateAnimations(deltaTime) {
        // Update leg animation based on movement
        const torso = this.bodies.torso;
        const velocity = torso.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (speed > 0.5 && !this.isKnockedOut) {
            // Walking animation - realistic foot placement
            if (this.currentAnimation !== 'punching' && this.currentAnimation !== 'kicking') {
                this.currentAnimation = 'walking';
            }
            this.legPhase += deltaTime * 8; // Slightly faster walking cycle
            
            // More natural leg swing with hip rotation
            const leftLegSwing = Math.sin(this.legPhase) * 0.5;
            const rightLegSwing = Math.sin(this.legPhase + Math.PI) * 0.5;
            
            // Position legs relative to torso
            const torsoPos = torso.position;
            
            // Calculate foot lift height based on swing phase
            const leftFootLift = Math.max(0, Math.sin(this.legPhase)) * 0.3;
            const rightFootLift = Math.max(0, Math.sin(this.legPhase + Math.PI)) * 0.3;
            
            // Left upper leg - connected to hip
            this.meshes.leftUpperLeg.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 0.45,
                torsoPos.z
            );
            this.meshes.leftUpperLeg.rotation.x = leftLegSwing * 0.8;
            
            // Left lower leg - bends naturally at knee
            const leftKneeBend = Math.max(0, -leftLegSwing * 1.2);
            this.meshes.leftLowerLeg.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 1.35 + leftFootLift * 0.3,
                torsoPos.z + Math.sin(this.legPhase) * 0.15
            );
            this.meshes.leftLowerLeg.rotation.x = leftKneeBend;
            
            // Left foot - stays flat on ground when planted
            const leftFootZ = Math.sin(this.legPhase) * 0.25;
            this.meshes.leftFoot.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 2.0 + leftFootLift,
                torsoPos.z + leftFootZ
            );
            this.meshes.leftFoot.rotation.x = leftKneeBend * 0.3; // Slight angle for natural walk
            
            // Right upper leg - opposite phase
            this.meshes.rightUpperLeg.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 0.45,
                torsoPos.z
            );
            this.meshes.rightUpperLeg.rotation.x = rightLegSwing * 0.8;
            
            // Right lower leg - bends naturally at knee
            const rightKneeBend = Math.max(0, -rightLegSwing * 1.2);
            this.meshes.rightLowerLeg.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 1.35 + rightFootLift * 0.3,
                torsoPos.z + Math.sin(this.legPhase + Math.PI) * 0.15
            );
            this.meshes.rightLowerLeg.rotation.x = rightKneeBend;
            
            // Right foot - stays flat on ground when planted
            const rightFootZ = Math.sin(this.legPhase + Math.PI) * 0.25;
            this.meshes.rightFoot.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 2.0 + rightFootLift,
                torsoPos.z + rightFootZ
            );
            this.meshes.rightFoot.rotation.x = rightKneeBend * 0.3; // Slight angle for natural walk
        } else if (!this.isKnockedOut) {
            // Idle - legs in neutral position with slight breathing motion
            if (this.currentAnimation !== 'punching' && this.currentAnimation !== 'kicking') {
                this.currentAnimation = 'idle';
            }
            const torsoPos = torso.position;
            
            // Smoothly return to neutral
            this.meshes.leftUpperLeg.position.set(torsoPos.x - 0.2, torsoPos.y - 0.45, torsoPos.z);
            this.meshes.leftUpperLeg.rotation.x *= 0.9;
            
            this.meshes.leftLowerLeg.position.set(torsoPos.x - 0.2, torsoPos.y - 1.35, torsoPos.z);
            this.meshes.leftLowerLeg.rotation.x *= 0.9;
            
            this.meshes.leftFoot.position.set(torsoPos.x - 0.2, torsoPos.y - 1.9, torsoPos.z);
            
            this.meshes.rightUpperLeg.position.set(torsoPos.x + 0.2, torsoPos.y - 0.45, torsoPos.z);
            this.meshes.rightUpperLeg.rotation.x *= 0.9;
            
            this.meshes.rightLowerLeg.position.set(torsoPos.x + 0.2, torsoPos.y - 1.35, torsoPos.z);
            this.meshes.rightLowerLeg.rotation.x *= 0.9;
            
            this.meshes.rightFoot.position.set(torsoPos.x + 0.2, torsoPos.y - 1.9, torsoPos.z);
        }
    }
    
    syncAllMeshesToPhysics() {
        // Sync all physics-driven parts
        for (const [name, body] of Object.entries(this.bodies)) {
            if (this.meshes[name]) {
                this.meshes[name].position.copy(body.position);
                this.meshes[name].quaternion.copy(body.quaternion);
            }
        }
    }
    
    updateAI(deltaTime) {
        this.aiThinkCounter++;
        if (this.aiThinkCounter >= this.aiThinkInterval) {
            this.aiThinkCounter = 0;
            this.think();
        }
        
        if (this.actionCooldown > 0) {
            this.actionCooldown--;
        }
        
        switch (this.aiState) {
            case 'seeking':
                this.executeSeek();
                break;
            case 'attacking':
                this.executeAttack();
                break;
            case 'grabbing':
                this.executeGrab();
                break;
        }
    }
    
    think() {
        if (this.isKnockedOut) return;
        
        const enemies = this.game.characters.filter(c => 
            c !== this && c.team !== this.team && c.isAlive
        );
        
        const knockedOutEnemies = enemies.filter(c => c.isKnockedOut && !c.isGrabbed);
        
        if (knockedOutEnemies.length > 0 && !this.isGrabbing) {
            this.aiTarget = knockedOutEnemies[0];
            this.aiState = 'grabbing';
        } else if (enemies.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            
            for (const enemy of enemies) {
                if (enemy.isKnockedOut) continue;
                const dist = this.body.position.distanceTo(enemy.body.position);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemy;
                }
            }
            
            this.aiTarget = nearest;
            
            if (nearestDist < 3.5) {
                this.aiState = 'attacking';
            } else {
                this.aiState = 'seeking';
            }
        } else {
            this.aiState = 'idle';
        }
    }
    
    executeSeek() {
        if (!this.aiTarget || !this.aiTarget.isAlive) {
            this.aiState = 'idle';
            return;
        }
        
        const direction = new CANNON.Vec3();
        this.aiTarget.body.position.vsub(this.body.position, direction);
        direction.y = 0;
        const distance = direction.length();
        direction.normalize();
        
        // Apply horizontal force only to move - no upward force
        const moveForce = 120 * this.speed; // Reduced force for smoother movement
        this.body.applyForce(
            new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
            this.body.position
        );
        
        // Limit horizontal velocity to prevent excessive speed
        const maxSpeed = 4;
        const horizontalVel = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.z ** 2);
        if (horizontalVel > maxSpeed) {
            const scale = maxSpeed / horizontalVel;
            this.body.velocity.x *= scale;
            this.body.velocity.z *= scale;
        }
        
        // Smoothly rotate torso to face target
        const targetAngle = Math.atan2(direction.x, direction.z);
        const currentAngle = Math.atan2(
            2 * (this.body.quaternion.w * this.body.quaternion.y + this.body.quaternion.x * this.body.quaternion.z),
            1 - 2 * (this.body.quaternion.y ** 2 + this.body.quaternion.z ** 2)
        );
        
        // Interpolate rotation for smooth turning
        let angleDiff = targetAngle - currentAngle;
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        const newAngle = currentAngle + angleDiff * 0.15; // Smooth interpolation
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), newAngle);
    }
    
    executeAttack() {
        if (!this.aiTarget || !this.aiTarget.isAlive || this.actionCooldown > 0) {
            return;
        }
        
        const distance = this.body.position.distanceTo(this.aiTarget.body.position);
        
        if (distance > 5) {
            this.aiState = 'seeking';
            return;
        }
        
        // Choose attack
        if (Math.random() < 0.65) {
            this.punch();
        } else {
            this.dropkick();
        }
        
        this.actionCooldown = 50 + Math.random() * 50;
    }
    
    executeGrab() {
        if (!this.aiTarget || !this.aiTarget.isKnockedOut || this.aiTarget.isGrabbed) {
            this.aiState = 'seeking';
            this.isGrabbing = false;
            this.grabbedTarget = null;
            return;
        }
        
        const distance = this.body.position.distanceTo(this.aiTarget.body.position);
        
        if (distance < 3 && !this.isGrabbing) {
            this.grab(this.aiTarget);
        } else if (this.isGrabbing && this.grabbedTarget) {
            // Move towards edge smoothly
            const edgeX = this.body.position.x > 0 ? 15 : -15;
            const edgeZ = this.body.position.z > 0 ? 15 : -15;
            
            const direction = new CANNON.Vec3(
                edgeX - this.body.position.x,
                0,
                edgeZ - this.body.position.z
            );
            direction.normalize();
            
            const moveForce = 60; // Reduced force for carrying
            this.body.applyForce(
                new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
                this.body.position
            );
            
            // Limit velocity while carrying
            const maxSpeed = 2.5;
            const horizontalVel = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.z ** 2);
            if (horizontalVel > maxSpeed) {
                const scale = maxSpeed / horizontalVel;
                this.body.velocity.x *= scale;
                this.body.velocity.z *= scale;
            }
            
            // Keep grabbed character close
            const grabOffset = new CANNON.Vec3(-direction.x * 1.2, 0.5, -direction.z * 1.2);
            const targetPos = new CANNON.Vec3(
                this.body.position.x + grabOffset.x,
                this.body.position.y + grabOffset.y,
                this.body.position.z + grabOffset.z
            );
            
            const pullDirection = new CANNON.Vec3();
            targetPos.vsub(this.grabbedTarget.body.position, pullDirection);
            const pullForce = 150;
            this.grabbedTarget.body.applyForce(
                pullDirection.scale(pullForce),
                this.grabbedTarget.body.position
            );
            
            // Dampen grabbed target's velocity
            this.grabbedTarget.body.velocity.scale(0.8, this.grabbedTarget.body.velocity);
            
            // Check if at edge
            const distFromCenter = Math.sqrt(
                this.body.position.x * this.body.position.x +
                this.body.position.z * this.body.position.z
            );
            
            if (distFromCenter > 13) {
                this.throwGrabbed();
            }
        } else {
            // Move towards target
            const direction = new CANNON.Vec3();
            this.aiTarget.body.position.vsub(this.body.position, direction);
            direction.y = 0;
            direction.normalize();
            
            const moveForce = 100;
            this.body.applyForce(
                new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
                this.body.position
            );
        }
    }
    
    punch() {
        this.currentAnimation = 'punching';
        this.punchTimer = 15; // ~250ms at 60fps for more realistic wind-up
        
        // Boxing-style punch with wind-up
        const hand = this.bodies.rightHand;
        const forearm = this.bodies.rightForearm;
        const upperArm = this.bodies.rightUpperArm;
        
        // Get direction character is facing
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        
        // Wind-up phase - pull arm back first (frames 0-5)
        if (this.punchTimer > 10) {
            const pullBackForce = 200;
            hand.applyForce(
                new CANNON.Vec3(-direction.x * pullBackForce, 0, -direction.z * pullBackForce),
                hand.position
            );
        } else {
            // Punch extension phase - explosive forward motion (frames 6-15)
            const punchForce = 800 * this.strength;
            hand.applyForce(
                new CANNON.Vec3(direction.x * punchForce, 50, direction.z * punchForce),
                hand.position
            );
            forearm.applyForce(
                new CANNON.Vec3(direction.x * punchForce * 0.6, 0, direction.z * punchForce * 0.6),
                forearm.position
            );
        }
        
        // Add body rotation for power
        this.body.angularVelocity.y += 0.3;
        
        // Store position for hit check (at peak extension)
        this.punchHitPos = hand.position.clone();
    }
    
    dropkick() {
        this.currentAnimation = 'kicking';
        this.kickTimer = 20; // ~333ms at 60fps for full dropkick animation
        
        // Dropkick has three phases: jump, extend, recovery
        const phase = this.kickTimer;
        
        // Get direction character is facing
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        
        if (phase > 15) {
            // Phase 1: Jump up (frames 0-5)
            const jumpForce = 600 * this.strength;
            this.body.applyForce(new CANNON.Vec3(0, jumpForce, 0), this.body.position);
        } else if (phase > 10) {
            // Phase 2: Extend legs and lunge forward (frames 6-10)
            const kickForce = 400 * this.strength;
            this.body.applyForce(
                new CANNON.Vec3(direction.x * kickForce, 100, direction.z * kickForce),
                this.body.position
            );
            
            // Rotate body horizontally for flying kick pose
            this.body.angularVelocity.x = -2;
        } else {
            // Phase 3: Follow-through (frames 11-20)
            // Let physics take over for natural landing
        }
        
        // Store direction for hit check
        this.kickDirection = direction.clone();
    }
    
    checkHit(attackPos, range, damage) {
        const enemies = this.game.characters.filter(c => 
            c !== this && c.team !== this.team && c.isAlive
        );
        
        for (const enemy of enemies) {
            const dist = attackPos.distanceTo(enemy.body.position);
            if (dist < range) {
                enemy.takeDamage(damage, attackPos);
            }
        }
    }
    
    takeDamage(amount, sourcePos) {
        this.health -= amount;
        
        // Apply knockback
        const direction = new CANNON.Vec3();
        this.body.position.vsub(sourcePos, direction);
        direction.normalize();
        
        const knockbackForce = 400 * (amount / 20) * this.strength;
        this.body.applyImpulse(
            new CANNON.Vec3(
                direction.x * knockbackForce,
                knockbackForce * 0.4,
                direction.z * knockbackForce
            ),
            this.body.position
        );
        
        if (this.health <= 0 && !this.isKnockedOut) {
            this.knockout();
        }
    }
    
    knockout() {
        this.isKnockedOut = true;
        this.knockoutTimer = 180 + Math.random() * 120;
        this.wakeupProgress = 0;
        this.health = 0;
        this.currentAnimation = 'knockout';
        
        // Stop balancing - let physics take over completely
        // Arms and head go fully ragdoll
        
        // Visual feedback
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material && mesh.material.opacity !== undefined) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0.7;
            }
        });
    }
    
    wakeUp() {
        this.isKnockedOut = false;
        this.health = 50;
        this.knockoutTimer = 0;
        this.wakeupProgress = 0;
        this.currentAnimation = 'idle';
        
        // Restore opacity
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material && mesh.material.opacity !== undefined) {
                mesh.material.transparent = false;
                mesh.material.opacity = 1.0;
            }
        });
        
        // Resume balancing
        // Break free if grabbed
        if (this.isGrabbed) {
            const grabber = this.game.characters.find(c => c.grabbedTarget === this);
            if (grabber) {
                grabber.releaseGrab();
            }
            
            this.body.applyImpulse(
                new CANNON.Vec3(
                    (Math.random() - 0.5) * 500,
                    400,
                    (Math.random() - 0.5) * 500
                ),
                this.body.position
            );
        }
    }
    
    grab(target) {
        this.isGrabbing = true;
        this.grabbedTarget = target;
        target.isGrabbed = true;
    }
    
    releaseGrab() {
        if (this.grabbedTarget) {
            this.grabbedTarget.isGrabbed = false;
            this.grabbedTarget = null;
        }
        this.isGrabbing = false;
    }
    
    throwGrabbed() {
        if (!this.grabbedTarget) return;
        
        const direction = new CANNON.Vec3();
        this.grabbedTarget.body.position.vsub(this.body.position, direction);
        direction.normalize();
        
        this.grabbedTarget.body.applyImpulse(
            new CANNON.Vec3(direction.x * 1000, -300, direction.z * 1000),
            this.grabbedTarget.body.position
        );
        
        this.releaseGrab();
    }
    
    applyPowerBoost() {
        this.strength = 2.0;
        this.speed = 1.5;
        this.health = Math.min(100, this.health + 50);
        this.powerBoostTimer = 600;
        
        // Add glow
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material && mesh.material.emissive) {
                mesh.material.emissive.setHex(0xFFD700);
                mesh.material.emissiveIntensity = 0.5;
            }
        });
    }
    
    removePowerEffect() {
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material && mesh.material.emissive) {
                mesh.material.emissive.setHex(0x000000);
                mesh.material.emissiveIntensity = 0;
            }
        });
    }
    
    die() {
        this.isAlive = false;
    }
    
    destroy() {
        // Remove all physics bodies
        for (const body of Object.values(this.bodies)) {
            this.game.world.removeBody(body);
        }
        
        // Remove all constraints
        for (const constraint of this.constraints) {
            this.game.world.removeConstraint(constraint);
        }
        
        // Remove visual
        this.game.scene.remove(this.rootGroup);
    }
}
