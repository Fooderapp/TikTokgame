// Physics-Based Ragdoll Character System
// Inspired by Gang Beasts, Party Animals, and Fall Guys
// Mixamo-compatible bone structure with real physics simulation

class PhysicsCharacter {
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
        
        // Physics bodies for ragdoll - Mixamo-compatible structure
        this.bodies = {};
        this.joints = {};
        this.meshes = {};
        
        // Root group for visual representation
        this.rootGroup = new THREE.Group();
        this.game.scene.add(this.rootGroup);
        
        // Create the ragdoll
        this.createRagdoll();
        this.setupAI();
    }
    
    createRagdoll() {
        const color = this.team === 'blue' ? 0x4A90E2 : 0xE24A4A;
        const spawnX = this.team === 'blue' ? -8 : 8;
        const spawnZ = 0;
        const spawnY = 0; // Spawn above platform
        
        // Define body part dimensions (similar to Mixamo proportions)
        const bodyParts = {
            // Torso/Spine
            hips: { size: [0.8, 0.6, 0.5], mass: 3, pos: [0, 0, 0] },
            spine: { size: [0.7, 0.8, 0.4], mass: 2.5, pos: [0, 1.0, 0] },
            chest: { size: [0.9, 0.8, 0.5], mass: 2.5, pos: [0, 2.0, 0] },
            
            // Head/Neck
            neck: { size: [0.3, 0.4, 0.3], mass: 0.5, pos: [0, 2.9, 0] },
            head: { size: [0.8, 0.9, 0.8], mass: 1.5, pos: [0, 3.6, 0] },
            
            // Left Arm
            leftUpperArm: { size: [0.25, 0.8, 0.25], mass: 0.8, pos: [-1.2, 2.0, 0] },
            leftForearm: { size: [0.22, 0.8, 0.22], mass: 0.6, pos: [-1.2, 0.7, 0] },
            leftHand: { size: [0.3, 0.4, 0.2], mass: 0.3, pos: [-1.2, -0.4, 0] },
            
            // Right Arm
            rightUpperArm: { size: [0.25, 0.8, 0.25], mass: 0.8, pos: [1.2, 2.0, 0] },
            rightForearm: { size: [0.22, 0.8, 0.22], mass: 0.6, pos: [1.2, 0.7, 0] },
            rightHand: { size: [0.3, 0.4, 0.2], mass: 0.3, pos: [1.2, -0.4, 0] },
            
            // Left Leg
            leftUpperLeg: { size: [0.35, 1.0, 0.35], mass: 1.2, pos: [-0.3, -1.2, 0] },
            leftLowerLeg: { size: [0.3, 1.0, 0.3], mass: 0.9, pos: [-0.3, -2.5, 0] },
            leftFoot: { size: [0.35, 0.25, 0.7], mass: 0.5, pos: [-0.3, -3.6, 0.2] },
            
            // Right Leg
            rightUpperLeg: { size: [0.35, 1.0, 0.35], mass: 1.2, pos: [0.3, -1.2, 0] },
            rightLowerLeg: { size: [0.3, 1.0, 0.3], mass: 0.9, pos: [0.3, -2.5, 0] },
            rightFoot: { size: [0.35, 0.25, 0.7], mass: 0.5, pos: [0.3, -3.6, 0.2] }
        };
        
        // Create physics bodies and visual meshes for each body part
        for (const [name, part] of Object.entries(bodyParts)) {
            // Physics body
            const shape = new CANNON.Box(new CANNON.Vec3(
                part.size[0] / 2,
                part.size[1] / 2,
                part.size[2] / 2
            ));
            
            const body = new CANNON.Body({
                mass: part.mass,
                shape: shape,
                position: new CANNON.Vec3(
                    spawnX + part.pos[0],
                    spawnY + part.pos[1] + 1.0, // Spawn higher above platform
                    spawnZ + part.pos[2]
                ),
                linearDamping: 0.4,
                angularDamping: 0.7
            });
            
            // Material for better physics interaction
            body.material = new CANNON.Material();
            body.material.friction = 0.8;
            body.material.restitution = 0.1;
            
            this.game.world.addBody(body);
            this.bodies[name] = body;
            
            // Visual mesh
            const geometry = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
            const material = new THREE.MeshPhongMaterial({
                color: name.includes('head') || name.includes('Hand') || name.includes('neck') ? 0xFFDBAC : color,
                shininess: 30
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            this.rootGroup.add(mesh);
            this.meshes[name] = mesh;
        }
        
        // Create joints connecting body parts - using constraints
        this.createJoints();
        
        // Add eyes to head
        this.addEyes();
        
        // Main body reference (hips) for AI movement
        this.body = this.bodies.hips;
    }
    
    createJoints() {
        // Define joint connections with constraints
        // Each joint has parent-child relationship and angle limits
        const jointConnections = [
            // Spine connections
            { parent: 'hips', child: 'spine', type: 'ball', 
              parentPivot: [0, 0.4, 0], childPivot: [0, -0.4, 0] },
            { parent: 'spine', child: 'chest', type: 'ball', 
              parentPivot: [0, 0.5, 0], childPivot: [0, -0.4, 0] },
            { parent: 'chest', child: 'neck', type: 'ball', 
              parentPivot: [0, 0.5, 0], childPivot: [0, -0.2, 0] },
            { parent: 'neck', child: 'head', type: 'ball', 
              parentPivot: [0, 0.2, 0], childPivot: [0, -0.4, 0] },
            
            // Left arm connections
            { parent: 'chest', child: 'leftUpperArm', type: 'ball', 
              parentPivot: [-0.7, 0.3, 0], childPivot: [0, 0.4, 0] },
            { parent: 'leftUpperArm', child: 'leftForearm', type: 'hinge', 
              parentPivot: [0, -0.4, 0], childPivot: [0, 0.4, 0] },
            { parent: 'leftForearm', child: 'leftHand', type: 'ball', 
              parentPivot: [0, -0.4, 0], childPivot: [0, 0.2, 0] },
            
            // Right arm connections
            { parent: 'chest', child: 'rightUpperArm', type: 'ball', 
              parentPivot: [0.7, 0.3, 0], childPivot: [0, 0.4, 0] },
            { parent: 'rightUpperArm', child: 'rightForearm', type: 'hinge', 
              parentPivot: [0, -0.4, 0], childPivot: [0, 0.4, 0] },
            { parent: 'rightForearm', child: 'rightHand', type: 'ball', 
              parentPivot: [0, -0.4, 0], childPivot: [0, 0.2, 0] },
            
            // Left leg connections
            { parent: 'hips', child: 'leftUpperLeg', type: 'ball', 
              parentPivot: [-0.3, -0.3, 0], childPivot: [0, 0.5, 0] },
            { parent: 'leftUpperLeg', child: 'leftLowerLeg', type: 'hinge', 
              parentPivot: [0, -0.5, 0], childPivot: [0, 0.5, 0] },
            { parent: 'leftLowerLeg', child: 'leftFoot', type: 'ball', 
              parentPivot: [0, -0.5, 0], childPivot: [0, 0.1, -0.2] },
            
            // Right leg connections
            { parent: 'hips', child: 'rightUpperLeg', type: 'ball', 
              parentPivot: [0.3, -0.3, 0], childPivot: [0, 0.5, 0] },
            { parent: 'rightUpperLeg', child: 'rightLowerLeg', type: 'hinge', 
              parentPivot: [0, -0.5, 0], childPivot: [0, 0.5, 0] },
            { parent: 'rightLowerLeg', child: 'rightFoot', type: 'ball', 
              parentPivot: [0, -0.5, 0], childPivot: [0, 0.1, -0.2] }
        ];
        
        // Create constraints for joints
        for (const joint of jointConnections) {
            const parentBody = this.bodies[joint.parent];
            const childBody = this.bodies[joint.child];
            
            if (joint.type === 'ball') {
                // Point-to-point constraint (ball joint) with stronger settings
                const constraint = new CANNON.PointToPointConstraint(
                    parentBody,
                    new CANNON.Vec3(...joint.parentPivot),
                    childBody,
                    new CANNON.Vec3(...joint.childPivot)
                );
                constraint.collideConnected = false;
                this.game.world.addConstraint(constraint);
                this.joints[`${joint.parent}_${joint.child}`] = constraint;
            } else if (joint.type === 'hinge') {
                // Hinge constraint for elbows and knees
                const constraint = new CANNON.HingeConstraint(
                    parentBody,
                    childBody,
                    {
                        pivotA: new CANNON.Vec3(...joint.parentPivot),
                        axisA: new CANNON.Vec3(1, 0, 0),
                        pivotB: new CANNON.Vec3(...joint.childPivot),
                        axisB: new CANNON.Vec3(1, 0, 0)
                    }
                );
                constraint.collideConnected = false;
                this.game.world.addConstraint(constraint);
                this.joints[`${joint.parent}_${joint.child}`] = constraint;
            }
        }
    }
    
    addEyes() {
        // Add eyes to the head mesh
        const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        
        this.meshes.head.add(leftEye);
        this.meshes.head.add(rightEye);
        
        leftEye.position.set(-0.2, 0.15, 0.35);
        rightEye.position.set(0.2, 0.15, 0.35);
    }
    
    setupAI() {
        // AI behavior for physics-based character
        this.aiThinkInterval = 30; // Frames between AI decisions
        this.aiThinkCounter = 0;
    }
    
    update() {
        // Update visual meshes to match physics bodies
        for (const [name, body] of Object.entries(this.bodies)) {
            const mesh = this.meshes[name];
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
        }
        
        // Power boost timer
        if (this.powerBoostTimer > 0) {
            this.powerBoostTimer--;
            if (this.powerBoostTimer === 0) {
                this.strength = 1.0;
                this.speed = 1.0;
                // Remove glow effect
                Object.values(this.meshes).forEach(mesh => {
                    if (mesh.material.emissive) {
                        mesh.material.emissive.setHex(0x000000);
                    }
                });
            }
        }
        
        // Knockout system
        if (this.isKnockedOut) {
            this.knockoutTimer--;
            
            // Wake up check
            if (this.isGrabbed) {
                this.wakeupProgress += 0.5; // Wake faster when grabbed
            } else {
                this.wakeupProgress += 1.0;
            }
            
            if (this.wakeupProgress >= this.knockoutTimer || this.knockoutTimer <= 0) {
                this.wakeUp();
            }
        } else if (this.isAlive) {
            // AI behavior
            this.updateAI();
            
            // Apply balance/standing force to hips to keep upright
            this.applyBalanceForce();
        }
        
        // Check if fallen off platform
        if (this.body.position.y < -40) {
            // Character has fallen off
        }
    }
    
    applyBalanceForce() {
        // Apply forces to keep character upright (Gang Beasts style motor system)
        if (!this.isKnockedOut) {
            const hips = this.bodies.hips;
            const spine = this.bodies.spine;
            const chest = this.bodies.chest;
            
            // Strong upward force to keep character standing
            const targetHeight = 0; // Platform level
            if (hips.position.y < targetHeight) {
                const upForce = (targetHeight - hips.position.y) * 200 * this.speed;
                hips.applyForce(new CANNON.Vec3(0, upForce, 0), hips.position);
            }
            
            // Apply strong angular damping to keep torso upright
            hips.angularVelocity.scale(0.7, hips.angularVelocity);
            spine.angularVelocity.scale(0.7, spine.angularVelocity);
            chest.angularVelocity.scale(0.7, chest.angularVelocity);
            
            // Try to keep hips level (reduce X and Z rotation)
            const uprightQuaternion = new CANNON.Quaternion();
            uprightQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
            
            // Blend towards upright orientation
            const blendFactor = 0.02;
            hips.quaternion.x = hips.quaternion.x * (1 - blendFactor) + uprightQuaternion.x * blendFactor;
            hips.quaternion.z = hips.quaternion.z * (1 - blendFactor) + uprightQuaternion.z * blendFactor;
            hips.quaternion.normalize();
        }
    }
    
    updateAI() {
        this.aiThinkCounter++;
        if (this.aiThinkCounter >= this.aiThinkInterval) {
            this.aiThinkCounter = 0;
            this.think();
        }
        
        // Execute current action
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
        // AI decision making
        if (this.isKnockedOut) return;
        
        // Find targets
        const enemies = this.game.characters.filter(c => 
            c !== this && c.team !== this.team && c.isAlive
        );
        
        const knockedOutEnemies = enemies.filter(c => c.isKnockedOut && !c.isGrabbed);
        
        if (knockedOutEnemies.length > 0 && !this.isGrabbing) {
            // Try to grab knocked out enemy
            this.aiTarget = knockedOutEnemies[0];
            this.aiState = 'grabbing';
        } else if (enemies.length > 0) {
            // Find nearest enemy
            let nearest = null;
            let nearestDist = Infinity;
            
            for (const enemy of enemies) {
                const dist = this.body.position.distanceTo(enemy.body.position);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemy;
                }
            }
            
            this.aiTarget = nearest;
            
            if (nearestDist < 3) {
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
        
        // Move towards target using physics forces applied to torso
        const direction = new CANNON.Vec3();
        this.aiTarget.body.position.vsub(this.body.position, direction);
        direction.y = 0; // Only move horizontally
        direction.normalize();
        
        // Apply force to hips and chest for more stable movement
        const moveForce = 150 * this.speed;
        this.body.applyForce(
            new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
            this.body.position
        );
        
        // Also apply smaller force to chest for stability
        const chestForce = 100 * this.speed;
        this.bodies.chest.applyForce(
            new CANNON.Vec3(direction.x * chestForce, 0, direction.z * chestForce),
            this.bodies.chest.position
        );
    }
    
    executeAttack() {
        if (!this.aiTarget || !this.aiTarget.isAlive) {
            this.aiState = 'seeking';
            return;
        }
        
        if (this.actionCooldown > 0) return;
        
        const distance = this.body.position.distanceTo(this.aiTarget.body.position);
        
        if (distance > 4) {
            this.aiState = 'seeking';
            return;
        }
        
        // Randomly choose attack
        if (Math.random() < 0.6) {
            this.punch();
        } else {
            this.dropkick();
        }
        
        this.actionCooldown = 60 + Math.random() * 60; // 1-2 seconds
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
            // Grab the target
            this.grab(this.aiTarget);
        } else if (this.isGrabbing) {
            // Move towards platform edge
            const edgeX = this.body.position.x > 0 ? 15 : -15;
            const edgeZ = this.body.position.z > 0 ? 15 : -15;
            
            const direction = new CANNON.Vec3(edgeX - this.body.position.x, 0, edgeZ - this.body.position.z);
            direction.normalize();
            
            const moveForce = 60;
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
            // Move towards knocked out target
            const direction = new CANNON.Vec3();
            this.aiTarget.body.position.vsub(this.body.position, direction);
            direction.y = 0;
            direction.normalize();
            
            const moveForce = 70;
            this.body.applyForce(
                new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
                this.body.position
            );
        }
    }
    
    punch() {
        // Apply force to right hand to punch
        const hand = this.bodies.rightHand;
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        
        const punchForce = 500 * this.strength;
        hand.applyForce(
            new CANNON.Vec3(direction.x * punchForce, 0, direction.z * punchForce),
            hand.position
        );
        
        // Check for hit
        this.checkHit(hand.position, 1.5, 20);
    }
    
    dropkick() {
        // Apply upward force to hips and forward force to feet
        this.body.applyForce(new CANNON.Vec3(0, 300, 0), this.body.position);
        
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        
        const kickForce = 600 * this.strength;
        this.bodies.leftFoot.applyForce(
            new CANNON.Vec3(direction.x * kickForce, 0, direction.z * kickForce),
            this.bodies.leftFoot.position
        );
        this.bodies.rightFoot.applyForce(
            new CANNON.Vec3(direction.x * kickForce, 0, direction.z * kickForce),
            this.bodies.rightFoot.position
        );
        
        // Check for hit
        setTimeout(() => {
            this.checkHit(this.bodies.leftFoot.position, 2.0, 35);
        }, 100);
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
        
        // Apply knockback force
        const direction = new CANNON.Vec3();
        this.body.position.vsub(sourcePos, direction);
        direction.normalize();
        
        const knockbackForce = 300 * (amount / 20);
        this.body.applyImpulse(
            new CANNON.Vec3(direction.x * knockbackForce, knockbackForce * 0.5, direction.z * knockbackForce),
            this.body.position
        );
        
        if (this.health <= 0) {
            this.knockout();
        }
    }
    
    knockout() {
        this.isKnockedOut = true;
        this.knockoutTimer = 180 + Math.random() * 120; // 3-5 seconds at 60fps
        this.wakeupProgress = 0;
        this.health = 0;
        
        // Make character ragdoll (reduce motor forces)
        // Visual feedback
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material.opacity !== undefined) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0.7;
            }
        });
    }
    
    wakeUp() {
        this.isKnockedOut = false;
        this.health = 50;
        this.knockoutTimer = 0;
        
        // Restore opacity
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material.opacity !== undefined) {
                mesh.material.transparent = false;
                mesh.material.opacity = 1.0;
            }
        });
        
        // Break free if grabbed
        if (this.isGrabbed) {
            const grabber = this.game.characters.find(c => c.grabbedTarget === this);
            if (grabber) {
                grabber.releaseGrab();
            }
            
            // Apply escape force
            this.body.applyImpulse(
                new CANNON.Vec3(
                    (Math.random() - 0.5) * 400,
                    300,
                    (Math.random() - 0.5) * 400
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
            new CANNON.Vec3(direction.x * 800, -200, direction.z * 800),
            this.grabbedTarget.body.position
        );
        
        this.releaseGrab();
    }
    
    applyPowerBoost() {
        this.strength = 2.0;
        this.speed = 1.5;
        this.health = Math.min(100, this.health + 50);
        this.powerBoostTimer = 600; // 10 seconds at 60fps
        
        // Add golden glow
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material.emissive) {
                mesh.material.emissive.setHex(0xFFD700);
                mesh.material.emissiveIntensity = 0.5;
            }
        });
    }
    
    die() {
        this.isAlive = false;
    }
    
    destroy() {
        // Remove physics bodies
        for (const body of Object.values(this.bodies)) {
            this.game.world.removeBody(body);
        }
        
        // Remove constraints
        for (const joint of Object.values(this.joints)) {
            this.game.world.removeConstraint(joint);
        }
        
        // Remove visual meshes
        this.game.scene.remove(this.rootGroup);
    }
}
