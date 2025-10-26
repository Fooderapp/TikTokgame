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
        const spawnY = 2;
        
        // === SELF-BALANCING CAPSULE (Torso + Hips) ===
        // This is the main body that stays balanced
        const capsuleShape = new CANNON.Cylinder(0.4, 0.4, 1.8, 12);
        const capsuleBody = new CANNON.Body({
            mass: 8,
            shape: capsuleShape,
            position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
            linearDamping: 0.3,
            angularDamping: 0.8
        });
        capsuleBody.material = new CANNON.Material();
        capsuleBody.material.friction = 0.8;
        capsuleBody.material.restitution = 0.1;
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
            mass: 1.5,
            shape: headShape,
            position: new CANNON.Vec3(spawnX, spawnY + 1.3, spawnZ),
            linearDamping: 0.4,
            angularDamping: 0.7
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
        
        // Connect head to torso with point constraint
        const headConstraint = new CANNON.PointToPointConstraint(
            capsuleBody,
            new CANNON.Vec3(0, 0.9, 0),
            headBody,
            new CANNON.Vec3(0, -0.3, 0)
        );
        headConstraint.collideConnected = false;
        this.game.world.addConstraint(headConstraint);
        this.constraints.push(headConstraint);
        
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
            mass: 0.8,
            shape: upperArmShape,
            position: new CANNON.Vec3(x + xOffset, y + 0.5, z),
            linearDamping: 0.6,
            angularDamping: 0.7
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
            mass: 0.6,
            shape: forearmShape,
            position: new CANNON.Vec3(x + xOffset, y - 0.3, z),
            linearDamping: 0.6,
            angularDamping: 0.7
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
            mass: 0.4,
            shape: handShape,
            position: new CANNON.Vec3(x + xOffset, y - 1.0, z),
            linearDamping: 0.5,
            angularDamping: 0.7
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
        
        // Keep capsule upright with strong stabilization
        const targetHeight = 0.9; // Height above platform
        if (torso.position.y < targetHeight) {
            const upForce = (targetHeight - torso.position.y) * 500 * this.speed;
            torso.applyForce(new CANNON.Vec3(0, upForce, 0), torso.position);
        }
        
        // Strong angular damping to keep upright
        torso.angularVelocity.scale(0.5, torso.angularVelocity);
        
        // Actively correct rotation to stay upright
        const uprightQuat = new CANNON.Quaternion();
        uprightQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
        
        // Blend towards upright
        const blendFactor = 0.08;
        torso.quaternion.x = torso.quaternion.x * (1 - blendFactor) + uprightQuat.x * blendFactor;
        torso.quaternion.z = torso.quaternion.z * (1 - blendFactor) + uprightQuat.z * blendFactor;
        torso.quaternion.normalize();
        
        // Apply arm damping to prevent flailing when not attacking
        if (this.currentAnimation !== 'punching' && this.currentAnimation !== 'kicking') {
            ['leftUpperArm', 'rightUpperArm', 'leftForearm', 'rightForearm'].forEach(part => {
                if (this.bodies[part]) {
                    this.bodies[part].angularVelocity.scale(0.8, this.bodies[part].angularVelocity);
                }
            });
        }
    }
    
    updateAnimations(deltaTime) {
        // Update leg animation based on movement
        const torso = this.bodies.torso;
        const velocity = torso.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (speed > 0.5) {
            // Walking animation
            this.currentAnimation = 'walking';
            this.legPhase += deltaTime * 6;
            
            const leftLegAngle = Math.sin(this.legPhase) * 0.6;
            const rightLegAngle = Math.sin(this.legPhase + Math.PI) * 0.6;
            
            // Position legs relative to torso
            const torsoPos = torso.position;
            const torsoRot = torso.quaternion;
            
            // Left upper leg
            this.meshes.leftUpperLeg.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 0.45,
                torsoPos.z
            );
            this.meshes.leftUpperLeg.rotation.x = leftLegAngle;
            
            // Left lower leg
            this.meshes.leftLowerLeg.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 1.35,
                torsoPos.z + Math.max(0, Math.sin(this.legPhase)) * 0.2
            );
            this.meshes.leftLowerLeg.rotation.x = Math.max(0, -leftLegAngle);
            
            // Left foot
            this.meshes.leftFoot.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 1.9,
                torsoPos.z + Math.sin(this.legPhase) * 0.15
            );
            
            // Right upper leg
            this.meshes.rightUpperLeg.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 0.45,
                torsoPos.z
            );
            this.meshes.rightUpperLeg.rotation.x = rightLegAngle;
            
            // Right lower leg
            this.meshes.rightLowerLeg.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 1.35,
                torsoPos.z + Math.max(0, Math.sin(this.legPhase + Math.PI)) * 0.2
            );
            this.meshes.rightLowerLeg.rotation.x = Math.max(0, -rightLegAngle);
            
            // Right foot
            this.meshes.rightFoot.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 1.9,
                torsoPos.z + Math.sin(this.legPhase + Math.PI) * 0.15
            );
        } else {
            // Idle - legs in neutral position
            this.currentAnimation = 'idle';
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
        direction.normalize();
        
        // Apply force to move
        const moveForce = 180 * this.speed;
        this.body.applyForce(
            new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
            this.body.position
        );
        
        // Rotate torso to face target (simple direct rotation)
        const targetAngle = Math.atan2(direction.x, direction.z);
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), targetAngle);
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
            // Move towards edge
            const edgeX = this.body.position.x > 0 ? 15 : -15;
            const edgeZ = this.body.position.z > 0 ? 15 : -15;
            
            const direction = new CANNON.Vec3(
                edgeX - this.body.position.x,
                0,
                edgeZ - this.body.position.z
            );
            direction.normalize();
            
            const moveForce = 80;
            this.body.applyForce(
                new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
                this.body.position
            );
            
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
        this.punchTimer = 9; // ~150ms at 60fps
        
        // Apply strong force to right hand for punching
        const hand = this.bodies.rightHand;
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        
        const punchForce = 600 * this.strength;
        hand.applyForce(
            new CANNON.Vec3(direction.x * punchForce, 100, direction.z * punchForce),
            hand.position
        );
        
        // Store position for hit check
        this.punchHitPos = hand.position.clone();
    }
    
    dropkick() {
        this.currentAnimation = 'kicking';
        this.kickTimer = 12; // ~200ms at 60fps
        
        // Jump
        this.body.applyForce(new CANNON.Vec3(0, 400, 0), this.body.position);
        
        // Forward momentum
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        
        const kickForce = 200;
        this.body.applyForce(
            new CANNON.Vec3(direction.x * kickForce, 0, direction.z * kickForce),
            this.body.position
        );
        
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
