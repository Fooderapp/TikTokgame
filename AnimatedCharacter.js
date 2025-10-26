// Enhanced Character System with Animation-Driven Movement
// Matches Gang Beasts, Party Animals, and Fall Guys gameplay feel
// Supports Mixamo models and proper skeletal animations

class AnimatedCharacter {
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
        
        // Movement state (animation-driven)
        this.velocity = new THREE.Vector3();
        this.targetDirection = new THREE.Vector3();
        this.moveSpeed = 3.0; // Units per second
        this.rotationSpeed = 5.0; // Radians per second
        
        // Animation system
        this.animationState = 'idle';
        this.animationTime = 0;
        this.animationBlendFactor = 0;
        
        // Visual representation
        this.rootGroup = new THREE.Group();
        this.characterMesh = null;
        this.bones = {};
        
        // Physics (simplified - only for collisions and ragdoll)
        this.physicsBody = null;
        this.ragdollBodies = {};
        this.ragdollConstraints = [];
        
        this.game.scene.add(this.rootGroup);
        
        // Create character
        this.createCharacter();
        this.setupPhysics();
        this.setupAI();
    }
    
    createCharacter() {
        const color = this.team === 'blue' ? 0x4A90E2 : 0xE24A4A;
        const spawnX = this.team === 'blue' ? -8 : 8;
        const spawnZ = 0;
        
        // Create a better-looking character with proper proportions
        // This can be replaced with actual Mixamo GLTF models
        
        const characterGroup = new THREE.Group();
        
        // Create body parts with proper hierarchy
        // Head
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const skinMat = new THREE.MeshPhongMaterial({ color: 0xFFDBAC });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 2.8;
        head.castShadow = true;
        characterGroup.add(head);
        this.bones.head = head;
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.1, 0.45);
        rightEye.position.set(0.15, 0.1, 0.45);
        head.add(leftEye);
        head.add(rightEye);
        
        // Torso
        const bodyMat = new THREE.MeshPhongMaterial({ color: color });
        const torsoGeo = new THREE.CylinderGeometry(0.5, 0.4, 1.2, 16);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 1.8;
        torso.castShadow = true;
        characterGroup.add(torso);
        this.bones.torso = torso;
        
        // Arms
        const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 12);
        const leftUpperArm = new THREE.Mesh(armGeo, bodyMat);
        const rightUpperArm = new THREE.Mesh(armGeo, bodyMat);
        leftUpperArm.position.set(-0.6, 2.0, 0);
        rightUpperArm.position.set(0.6, 2.0, 0);
        leftUpperArm.castShadow = true;
        rightUpperArm.castShadow = true;
        characterGroup.add(leftUpperArm);
        characterGroup.add(rightUpperArm);
        this.bones.leftArm = leftUpperArm;
        this.bones.rightArm = rightUpperArm;
        
        const forearmGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.7, 12);
        const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
        const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
        leftForearm.position.set(-0.6, 1.25, 0);
        rightForearm.position.set(0.6, 1.25, 0);
        leftForearm.castShadow = true;
        rightForearm.castShadow = true;
        characterGroup.add(leftForearm);
        characterGroup.add(rightForearm);
        this.bones.leftForearm = leftForearm;
        this.bones.rightForearm = rightForearm;
        
        // Hands
        const handGeo = new THREE.SphereGeometry(0.15, 12, 12);
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        const rightHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.set(-0.6, 0.8, 0);
        rightHand.position.set(0.6, 0.8, 0);
        leftHand.castShadow = true;
        rightHand.castShadow = true;
        characterGroup.add(leftHand);
        characterGroup.add(rightHand);
        this.bones.leftHand = leftHand;
        this.bones.rightHand = rightHand;
        
        // Hips
        const hipsGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
        const hips = new THREE.Mesh(hipsGeo, bodyMat);
        hips.position.y = 1.0;
        hips.castShadow = true;
        characterGroup.add(hips);
        this.bones.hips = hips;
        
        // Legs
        const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.9, 12);
        const leftUpperLeg = new THREE.Mesh(legGeo, bodyMat);
        const rightUpperLeg = new THREE.Mesh(legGeo, bodyMat);
        leftUpperLeg.position.set(-0.2, 0.5, 0);
        rightUpperLeg.position.set(0.2, 0.5, 0);
        leftUpperLeg.castShadow = true;
        rightUpperLeg.castShadow = true;
        characterGroup.add(leftUpperLeg);
        characterGroup.add(rightUpperLeg);
        this.bones.leftLeg = leftUpperLeg;
        this.bones.rightLeg = rightUpperLeg;
        
        const shinGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.9, 12);
        const leftLowerLeg = new THREE.Mesh(shinGeo, bodyMat);
        const rightLowerLeg = new THREE.Mesh(shinGeo, bodyMat);
        leftLowerLeg.position.set(-0.2, -0.4, 0);
        rightLowerLeg.position.set(0.2, -0.4, 0);
        leftLowerLeg.castShadow = true;
        rightLowerLeg.castShadow = true;
        characterGroup.add(leftLowerLeg);
        characterGroup.add(rightLowerLeg);
        this.bones.leftLowerLeg = leftLowerLeg;
        this.bones.rightLowerLeg = rightLowerLeg;
        
        // Feet
        const footGeo = new THREE.BoxGeometry(0.3, 0.2, 0.5);
        const leftFoot = new THREE.Mesh(footGeo, bodyMat);
        const rightFoot = new THREE.Mesh(footGeo, bodyMat);
        leftFoot.position.set(-0.2, -0.9, 0.1);
        rightFoot.position.set(0.2, -0.9, 0.1);
        leftFoot.castShadow = true;
        rightFoot.castShadow = true;
        characterGroup.add(leftFoot);
        characterGroup.add(rightFoot);
        this.bones.leftFoot = leftFoot;
        this.bones.rightFoot = rightFoot;
        
        this.characterMesh = characterGroup;
        this.rootGroup.add(characterGroup);
        this.rootGroup.position.set(spawnX, 0, spawnZ);
    }
    
    setupPhysics() {
        // Create single physics body for character (not full ragdoll during normal movement)
        // This matches Party Animals/Fall Guys approach
        
        const shape = new CANNON.Cylinder(0.5, 0.5, 2.5, 12);
        this.physicsBody = new CANNON.Body({
            mass: 10,
            shape: shape,
            position: new CANNON.Vec3(
                this.rootGroup.position.x,
                1.25,
                this.rootGroup.position.z
            ),
            linearDamping: 0.3,
            angularDamping: 0.9,
            fixedRotation: true // Keep upright during normal movement
        });
        
        this.physicsBody.material = new CANNON.Material();
        this.physicsBody.material.friction = 0.5;
        this.physicsBody.material.restitution = 0.1;
        
        this.game.world.addBody(this.physicsBody);
        
        // Store reference for easy access
        this.body = this.physicsBody;
    }
    
    setupAI() {
        this.aiThinkInterval = 30;
        this.aiThinkCounter = 0;
    }
    
    update(deltaTime) {
        // Main update loop - animation-driven movement
        
        // Update animation time
        this.animationTime += deltaTime;
        
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
            
            // In knockout, sync visual to physics (ragdoll)
            this.syncVisualToPhysics();
            this.updateRagdollAnimation(deltaTime);
        } else if (this.isAlive) {
            // Normal movement - animation-driven
            
            // AI behavior
            this.updateAI(deltaTime);
            
            // Update animations
            this.updateAnimations(deltaTime);
            
            // Sync physics to visual (animation drives physics)
            this.syncPhysicsToVisual();
        }
        
        // Check if fallen off platform
        if (this.physicsBody.position.y < -40) {
            // Character has fallen off
        }
    }
    
    updateAnimations(deltaTime) {
        // Play appropriate animation based on state
        
        const walkCycleSpeed = 1.5; // Animation speed
        const armSwingAmount = 0.3;
        const legSwingAmount = 0.4;
        
        if (this.animationState === 'walking') {
            // Walking animation
            const t = this.animationTime * walkCycleSpeed;
            
            // Legs - alternating swing
            this.bones.leftLeg.rotation.x = Math.sin(t) * legSwingAmount;
            this.bones.rightLeg.rotation.x = Math.sin(t + Math.PI) * legSwingAmount;
            this.bones.leftLowerLeg.rotation.x = Math.max(0, Math.sin(t + Math.PI / 2) * legSwingAmount);
            this.bones.rightLowerLeg.rotation.x = Math.max(0, Math.sin(t + Math.PI * 1.5) * legSwingAmount);
            
            // Feet
            this.bones.leftFoot.rotation.x = Math.sin(t) * legSwingAmount * 0.5;
            this.bones.rightFoot.rotation.x = Math.sin(t + Math.PI) * legSwingAmount * 0.5;
            
            // Arms - opposite of legs
            this.bones.leftArm.rotation.x = Math.sin(t + Math.PI) * armSwingAmount;
            this.bones.rightArm.rotation.x = Math.sin(t) * armSwingAmount;
            this.bones.leftForearm.rotation.x = Math.sin(t + Math.PI) * armSwingAmount * 0.5;
            this.bones.rightForearm.rotation.x = Math.sin(t) * armSwingAmount * 0.5;
            
            // Subtle body bob
            this.bones.torso.position.y = 1.8 + Math.abs(Math.sin(t * 2)) * 0.05;
            this.bones.head.position.y = 2.8 + Math.abs(Math.sin(t * 2)) * 0.05;
            
        } else if (this.animationState === 'idle') {
            // Idle breathing animation
            const breathe = Math.sin(this.animationTime * 2) * 0.02;
            this.bones.torso.position.y = 1.8 + breathe;
            this.bones.head.position.y = 2.8 + breathe;
            
            // Reset limbs to neutral
            this.bones.leftArm.rotation.x = THREE.MathUtils.lerp(this.bones.leftArm.rotation.x, 0, 0.1);
            this.bones.rightArm.rotation.x = THREE.MathUtils.lerp(this.bones.rightArm.rotation.x, 0, 0.1);
            this.bones.leftLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftLeg.rotation.x, 0, 0.1);
            this.bones.rightLeg.rotation.x = THREE.MathUtils.lerp(this.bones.rightLeg.rotation.x, 0, 0.1);
            this.bones.leftLowerLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftLowerLeg.rotation.x, 0, 0.1);
            this.bones.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(this.bones.rightLowerLeg.rotation.x, 0, 0.1);
            
        } else if (this.animationState === 'punching') {
            // Punch animation
            const punchProgress = this.animationTime * 4;
            if (punchProgress < 0.5) {
                // Wind up
                this.bones.rightArm.rotation.x = -punchProgress * 2;
                this.bones.rightForearm.rotation.x = -punchProgress * 1.5;
            } else if (punchProgress < 1.0) {
                // Extend
                const extend = (punchProgress - 0.5) * 2;
                this.bones.rightArm.rotation.x = -1 + extend * 2;
                this.bones.rightForearm.rotation.x = -0.75 + extend;
                this.bones.rightArm.rotation.z = extend * 0.5;
            } else {
                // Return to idle
                this.setAnimationState('idle');
            }
            
        } else if (this.animationState === 'kicking') {
            // Kick animation
            const kickProgress = this.animationTime * 3;
            if (kickProgress < 0.8) {
                // Wind up and kick
                this.bones.rightLeg.rotation.x = Math.sin(kickProgress * Math.PI) * 1.2;
                this.bones.torso.rotation.x = -kickProgress * 0.3;
            } else {
                // Return to idle
                this.setAnimationState('idle');
            }
        }
    }
    
    updateRagdollAnimation(deltaTime) {
        // When knocked out, make limbs floppy
        const flopAmount = 0.05;
        this.bones.leftArm.rotation.x += (Math.random() - 0.5) * flopAmount;
        this.bones.rightArm.rotation.x += (Math.random() - 0.5) * flopAmount;
        this.bones.leftLeg.rotation.x += (Math.random() - 0.5) * flopAmount;
        this.bones.rightLeg.rotation.x += (Math.random() - 0.5) * flopAmount;
        
        // Gradually settle
        this.bones.leftArm.rotation.x *= 0.95;
        this.bones.rightArm.rotation.x *= 0.95;
        this.bones.leftLeg.rotation.x *= 0.95;
        this.bones.rightLeg.rotation.x *= 0.95;
    }
    
    setAnimationState(newState) {
        if (this.animationState !== newState) {
            this.animationState = newState;
            this.animationTime = 0;
        }
    }
    
    syncPhysicsToVisual() {
        // Animation drives physics (normal movement)
        // Update physics body position to match visual
        this.physicsBody.position.x = this.rootGroup.position.x;
        this.physicsBody.position.z = this.rootGroup.position.z;
        this.physicsBody.position.y = 1.25; // Keep at constant height
        
        // Keep upright
        this.physicsBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.rootGroup.rotation.y);
    }
    
    syncVisualToPhysics() {
        // Physics drives animation (knockedout/ragdoll)
        this.rootGroup.position.x = this.physicsBody.position.x;
        this.rootGroup.position.y = this.physicsBody.position.y - 1.25;
        this.rootGroup.position.z = this.physicsBody.position.z;
        
        // Match rotation
        this.rootGroup.quaternion.copy(this.physicsBody.quaternion);
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
                this.executeSeek(deltaTime);
                break;
            case 'attacking':
                this.executeAttack();
                break;
            case 'grabbing':
                this.executeGrab();
                break;
            case 'idle':
                this.setAnimationState('idle');
                break;
        }
    }
    
    think() {
        // Find nearest enemy
        const enemies = this.game.characters.filter(c => 
            c.team !== this.team && c.isAlive && !c.isKnockedOut
        );
        
        if (enemies.length === 0) {
            // Check for knocked out enemies to grab
            const knockedOutEnemies = this.game.characters.filter(c =>
                c.team !== this.team && c.isAlive && c.isKnockedOut && !c.isGrabbed
            );
            
            if (knockedOutEnemies.length > 0 && !this.isGrabbing) {
                this.aiTarget = knockedOutEnemies[0];
                this.aiState = 'grabbing';
            } else {
                this.aiState = 'idle';
            }
            return;
        }
        
        // Find closest enemy
        let closestEnemy = null;
        let closestDist = Infinity;
        
        for (const enemy of enemies) {
            const dx = enemy.rootGroup.position.x - this.rootGroup.position.x;
            const dz = enemy.rootGroup.position.z - this.rootGroup.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }
        
        this.aiTarget = closestEnemy;
        
        // Decide action based on distance
        if (closestDist < 3) {
            this.aiState = 'attacking';
        } else {
            this.aiState = 'seeking';
        }
    }
    
    executeSeek(deltaTime) {
        if (!this.aiTarget || !this.aiTarget.isAlive) {
            this.aiState = 'idle';
            return;
        }
        
        // Calculate direction to target
        const dx = this.aiTarget.rootGroup.position.x - this.rootGroup.position.x;
        const dz = this.aiTarget.rootGroup.position.z - this.rootGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 0.1) {
            const dirX = dx / dist;
            const dirZ = dz / dist;
            
            // Move towards target (animation-driven)
            const moveSpeed = this.moveSpeed * this.speed * deltaTime * 60; // Convert to frame-based
            this.rootGroup.position.x += dirX * moveSpeed * deltaTime;
            this.rootGroup.position.z += dirZ * moveSpeed * deltaTime;
            
            // Rotate to face target
            const targetAngle = Math.atan2(dirX, dirZ);
            const currentAngle = this.rootGroup.rotation.y;
            let angleDiff = targetAngle - currentAngle;
            
            // Normalize angle difference
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this.rootGroup.rotation.y += angleDiff * this.rotationSpeed * deltaTime;
            
            // Play walking animation
            this.setAnimationState('walking');
        }
    }
    
    executeAttack() {
        if (!this.aiTarget || !this.aiTarget.isAlive || this.actionCooldown > 0) {
            return;
        }
        
        const dx = this.aiTarget.rootGroup.position.x - this.rootGroup.position.x;
        const dz = this.aiTarget.rootGroup.position.z - this.rootGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 4) {
            this.aiState = 'seeking';
            return;
        }
        
        // Perform attack
        if (Math.random() < 0.6) {
            this.punch();
        } else {
            this.dropkick();
        }
        
        this.actionCooldown = 60 + Math.random() * 60;
    }
    
    executeGrab() {
        if (!this.aiTarget || !this.aiTarget.isKnockedOut || this.aiTarget.isGrabbed) {
            this.aiState = 'idle';
            this.isGrabbing = false;
            this.grabbedTarget = null;
            return;
        }
        
        const dx = this.aiTarget.rootGroup.position.x - this.rootGroup.position.x;
        const dz = this.aiTarget.rootGroup.position.z - this.rootGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 2 && !this.isGrabbing) {
            // Grab the target
            this.isGrabbing = true;
            this.grabbedTarget = this.aiTarget;
            this.aiTarget.isGrabbed = true;
        }
        
        if (this.isGrabbing && this.grabbedTarget) {
            // Move towards platform edge
            const edgeX = this.rootGroup.position.x > 0 ? 15 : -15;
            const edgeZ = this.rootGroup.position.z > 0 ? 15 : -15;
            
            const toDx = edgeX - this.rootGroup.position.x;
            const toDz = edgeZ - this.rootGroup.position.z;
            const toDist = Math.sqrt(toDx * toDx + toDz * toDz);
            
            if (toDist > 0.1) {
                const deltaTime = 1 / 60;
                this.rootGroup.position.x += (toDx / toDist) * this.moveSpeed * deltaTime;
                this.rootGroup.position.z += (toDz / toDist) * this.moveSpeed * deltaTime;
            }
            
            // Position grabbed character behind
            const offsetDist = 1.5;
            const offsetAngle = this.rootGroup.rotation.y + Math.PI;
            this.grabbedTarget.rootGroup.position.x = this.rootGroup.position.x + Math.sin(offsetAngle) * offsetDist;
            this.grabbedTarget.rootGroup.position.z = this.rootGroup.position.z + Math.cos(offsetAngle) * offsetDist;
            
            // Dampen grabbed character's velocity
            this.grabbedTarget.physicsBody.velocity.scale(0.5, this.grabbedTarget.physicsBody.velocity);
            
            // Check if at edge
            const distFromCenter = Math.sqrt(
                this.rootGroup.position.x * this.rootGroup.position.x +
                this.rootGroup.position.z * this.rootGroup.position.z
            );
            
            if (distFromCenter > 13) {
                // Throw!
                this.throwGrabbedCharacter();
            }
        }
    }
    
    throwGrabbedCharacter() {
        if (!this.grabbedTarget) return;
        
        const throwForce = 400;
        const outwardDir = new CANNON.Vec3(
            this.grabbedTarget.rootGroup.position.x,
            0,
            this.grabbedTarget.rootGroup.position.z
        );
        outwardDir.normalize();
        
        this.grabbedTarget.physicsBody.applyImpulse(
            new CANNON.Vec3(
                outwardDir.x * throwForce,
                -throwForce * 0.5,
                outwardDir.z * throwForce
            ),
            this.grabbedTarget.physicsBody.position
        );
        
        this.grabbedTarget.isGrabbed = false;
        this.isGrabbing = false;
        this.grabbedTarget = null;
        this.aiState = 'idle';
    }
    
    punch() {
        this.setAnimationState('punching');
        
        // Check for hit immediately
        setTimeout(() => {
            this.checkHit(this.bones.rightHand.getWorldPosition(new THREE.Vector3()), 2.5, 20);
        }, 200); // Delay to match animation
    }
    
    dropkick() {
        this.setAnimationState('kicking');
        
        // Apply jump force to physics body
        this.physicsBody.applyImpulse(
            new CANNON.Vec3(0, 300, 0),
            this.physicsBody.position
        );
        
        // Apply forward force
        const forward = new CANNON.Vec3(
            Math.sin(this.rootGroup.rotation.y),
            0,
            Math.cos(this.rootGroup.rotation.y)
        );
        this.physicsBody.applyImpulse(
            forward.scale(150),
            this.physicsBody.position
        );
        
        // Check for hit
        setTimeout(() => {
            const kickPos = new THREE.Vector3(
                this.rootGroup.position.x + forward.x,
                this.rootGroup.position.y + 1,
                this.rootGroup.position.z + forward.z
            );
            this.checkHit(kickPos, 3, 35);
        }, 300);
    }
    
    checkHit(attackPos, range, damage) {
        for (const character of this.game.characters) {
            if (character === this || character.team === this.team || !character.isAlive) {
                continue;
            }
            
            const dx = character.rootGroup.position.x - attackPos.x;
            const dy = character.rootGroup.position.y - attackPos.y;
            const dz = character.rootGroup.position.z - attackPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist < range) {
                character.takeDamage(damage);
                
                // Apply knockback
                const knockbackDir = new CANNON.Vec3(dx, dy, dz);
                knockbackDir.normalize();
                
                const knockbackForce = damage * 10 * this.strength;
                character.physicsBody.applyImpulse(
                    new CANNON.Vec3(
                        knockbackDir.x * knockbackForce,
                        knockbackForce * 0.5,
                        knockbackDir.z * knockbackForce
                    ),
                    character.physicsBody.position
                );
            }
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        if (this.health <= 0 && !this.isKnockedOut) {
            this.knockout();
        }
    }
    
    knockout() {
        this.isKnockedOut = true;
        this.knockoutTimer = 180 + Math.random() * 120;
        this.wakeupProgress = 0;
        this.health = 0;
        
        // Disable fixed rotation for ragdoll effect
        this.physicsBody.fixedRotation = false;
        this.physicsBody.updateMassProperties();
        
        // Make semi-transparent
        this.characterMesh.traverse(child => {
            if (child.material) {
                child.material.opacity = 0.7;
                child.material.transparent = true;
            }
        });
        
        this.setAnimationState('knockout');
    }
    
    wakeUp() {
        this.isKnockedOut = false;
        this.health = 50;
        this.wakeupProgress = 0;
        
        // Re-enable fixed rotation
        this.physicsBody.fixedRotation = true;
        this.physicsBody.updateMassProperties();
        
        // Reset rotation to upright
        this.physicsBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.rootGroup.rotation.y);
        
        // Restore opacity
        this.characterMesh.traverse(child => {
            if (child.material) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        
        this.setAnimationState('idle');
        
        // Break free if grabbed
        if (this.isGrabbed) {
            const escapeForce = 200;
            this.physicsBody.applyImpulse(
                new CANNON.Vec3(
                    (Math.random() - 0.5) * escapeForce,
                    150,
                    (Math.random() - 0.5) * escapeForce
                ),
                this.physicsBody.position
            );
            this.isGrabbed = false;
        }
    }
    
    applyPowerBoost() {
        this.strength = 2.0;
        this.speed = 1.5;
        this.health = Math.min(100, this.health + 50);
        this.powerBoostTimer = 600;
        
        // Add glow effect
        this.characterMesh.traverse(child => {
            if (child.material) {
                child.material.emissive = new THREE.Color(0xFFD700);
                child.material.emissiveIntensity = 0.5;
            }
        });
    }
    
    removePowerEffect() {
        this.characterMesh.traverse(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.setHex(0x000000);
                child.material.emissiveIntensity = 0;
            }
        });
    }
    
    die() {
        // Mark as dead
        this.isAlive = false;
    }
    
    destroy() {
        // Clean up and remove character
        this.remove();
    }
    
    remove() {
        this.game.world.removeBody(this.physicsBody);
        this.game.scene.remove(this.rootGroup);
    }
}
