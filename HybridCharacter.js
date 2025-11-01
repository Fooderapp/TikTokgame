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
        
        // Boxing movement system
        this.boxingStance = true; // Boxing guard position
        this.headBobTime = 0; // For head bobbing/weaving
        this.footworkTime = 0; // For lateral footwork
        this.isWeaving = false; // Head movement state
        this.punchType = 'jab'; // jab, cross, hook, uppercut
        this.isBlocking = false; // Defensive stance
        this.comboCount = 0; // Track combo punches
        this.lastPunchTime = 0;
        
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
        const spawnY = -3.1; // Platform top is at -4, character bottom at about -3.1
        
        // === SELF-BALANCING CAPSULE (Torso + Hips) ===
        // This is the main body that stays balanced
        const capsuleShape = new CANNON.Cylinder(0.4, 0.4, 1.8, 12);
        const capsuleBody = new CANNON.Body({
            mass: 10, // Increased mass for better ground contact
            shape: capsuleShape,
            position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
            linearDamping: 0.3, // Reduced damping to allow movement
            angularDamping: 0.9 // High enough to prevent spinning but allow turning
        });
        capsuleBody.material = new CANNON.Material();
        capsuleBody.material.friction = 0.6; // Moderate friction for movement and stability
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
            mass: 2.5, // Increased mass for more stability and less bobbing
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
        this.aiThinkInterval = 20; // Reduced from 30 for more responsive AI
        this.aiThinkCounter = 0;
    }
    
    update(deltaTime) {
        // Update animation time
        this.animationTime += deltaTime;
        
        // Handle attack timers
        if (this.punchTimer > 0) {
            this.updatePunchAnimation();
            this.punchTimer--;
            if (this.punchTimer === 0 && this.punchHitPos && this.isAlive) {
                // Different damage and range for different punch types
                let damage = 20;
                let range = 2.0;
                
                switch (this.punchType) {
                    case 'jab':
                        damage = 15; // Fast but weak
                        range = 2.2; // Good reach
                        break;
                    case 'cross':
                        damage = 25; // Power punch
                        range = 2.0;
                        break;
                    case 'hook':
                        damage = 28; // High damage, wide swing
                        range = 2.3;
                        break;
                    case 'uppercut':
                        damage = 30; // Highest damage
                        range = 1.8; // Shorter range
                        break;
                    default:
                        damage = 20;
                        range = 2.0;
                }
                
                this.checkHit(this.punchHitPos, range, damage);
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
            this.updateBoxingGuard(); // Keep hands in guard position
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
        
        // Platform is at y=-5 with height 2, so top surface is at y=-4
        // Character torso cylinder is 1.8 tall, so center should be at about y=-3.1
        const platformTop = -4;
        const characterHalfHeight = 0.9; // Half of torso height
        const targetHeight = platformTop + characterHalfHeight; // -3.1
        
        // Ground contact detection - check if character is near platform
        const isOnGround = torso.position.y < targetHeight + 0.5;
        
        const heightDiff = targetHeight - torso.position.y;
        
        if (isOnGround && heightDiff > 0.05) {
            // Apply upward force if below target - stronger to prevent sinking
            const upForce = heightDiff * 600 * this.speed; // Stronger force to stand up
            torso.applyForce(new CANNON.Vec3(0, upForce, 0), torso.position);
        } else if (heightDiff < -0.05) {
            // Apply downward force if too high (prevent floating)
            const downForce = -heightDiff * 250; // Moderate downward force (heightDiff is negative)
            torso.applyForce(new CANNON.Vec3(0, -downForce, 0), torso.position);
        }
        
        // Strongly limit vertical velocity to prevent jumping/bouncing
        if (torso.velocity.y > 1) {
            torso.velocity.y = 1;
        }
        if (torso.velocity.y < -3) {
            torso.velocity.y = -3; // Limit fall speed too
        }
        
        // Strong angular damping to keep upright
        torso.angularVelocity.scale(0.3, torso.angularVelocity);
        
        // Actively correct rotation to stay upright
        const uprightQuat = new CANNON.Quaternion();
        uprightQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
        
        // Blend towards upright
        const blendFactor = 0.08; // Gentler correction to avoid overcorrection
        torso.quaternion.x = torso.quaternion.x * (1 - blendFactor) + uprightQuat.x * blendFactor;
        torso.quaternion.z = torso.quaternion.z * (1 - blendFactor) + uprightQuat.z * blendFactor;
        torso.quaternion.normalize();
        
        // Apply strong arm damping and position correction when not attacking
        if (this.currentAnimation !== 'punching' && this.currentAnimation !== 'kicking') {
            // Stabilize arms by dampening angular velocity heavily
            ['leftUpperArm', 'rightUpperArm', 'leftForearm', 'rightForearm', 'leftHand', 'rightHand'].forEach(part => {
                if (this.bodies[part]) {
                    // Much stronger damping for idle arms
                    this.bodies[part].angularVelocity.scale(0.3, this.bodies[part].angularVelocity);
                    this.bodies[part].velocity.scale(0.5, this.bodies[part].velocity);
                }
            });
            
            // Apply stronger forces to keep arms near rest position
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
                
                // Apply stronger return force for better stability
                const returnForce = 25; // Increased from 15
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
            head.angularVelocity.scale(0.2, head.angularVelocity); // Increased damping from 0.4
            head.velocity.scale(0.6, head.velocity); // Increased damping from 0.8
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
            this.legPhase += deltaTime * 10; // Increased speed for more visible walking
            
            // More pronounced leg swing with hip rotation
            const leftLegSwing = Math.sin(this.legPhase) * 0.7; // Increased amplitude
            const rightLegSwing = Math.sin(this.legPhase + Math.PI) * 0.7;
            
            // Position legs relative to torso
            const torsoPos = torso.position;
            
            // Calculate foot lift height based on swing phase - more pronounced
            const leftFootLift = Math.max(0, Math.sin(this.legPhase)) * 0.4; // Increased lift
            const rightFootLift = Math.max(0, Math.sin(this.legPhase + Math.PI)) * 0.4;
            
            // Left upper leg - connected to hip
            this.meshes.leftUpperLeg.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 0.45,
                torsoPos.z
            );
            this.meshes.leftUpperLeg.rotation.x = leftLegSwing;
            
            // Left lower leg - bends naturally at knee with more pronounced motion
            const leftKneeBend = Math.max(0, -leftLegSwing * 1.5); // Increased knee bend
            this.meshes.leftLowerLeg.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 1.35 + leftFootLift * 0.3,
                torsoPos.z + Math.sin(this.legPhase) * 0.2 // Increased forward motion
            );
            this.meshes.leftLowerLeg.rotation.x = leftKneeBend;
            
            // Left foot - stays flat on ground when planted
            const leftFootZ = Math.sin(this.legPhase) * 0.35; // Increased stride
            this.meshes.leftFoot.position.set(
                torsoPos.x - 0.2,
                torsoPos.y - 2.0 + leftFootLift,
                torsoPos.z + leftFootZ
            );
            this.meshes.leftFoot.rotation.x = leftKneeBend * 0.3;
            
            // Right upper leg - opposite phase
            this.meshes.rightUpperLeg.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 0.45,
                torsoPos.z
            );
            this.meshes.rightUpperLeg.rotation.x = rightLegSwing;
            
            // Right lower leg - bends naturally at knee with more pronounced motion
            const rightKneeBend = Math.max(0, -rightLegSwing * 1.5); // Increased knee bend
            this.meshes.rightLowerLeg.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 1.35 + rightFootLift * 0.3,
                torsoPos.z + Math.sin(this.legPhase + Math.PI) * 0.2 // Increased forward motion
            );
            this.meshes.rightLowerLeg.rotation.x = rightKneeBend;
            
            // Right foot - stays flat on ground when planted
            const rightFootZ = Math.sin(this.legPhase + Math.PI) * 0.35; // Increased stride
            this.meshes.rightFoot.position.set(
                torsoPos.x + 0.2,
                torsoPos.y - 2.0 + rightFootLift,
                torsoPos.z + rightFootZ
            );
            this.meshes.rightFoot.rotation.x = rightKneeBend * 0.3;
        } else if (!this.isKnockedOut) {
            // Idle - Boxing stance with subtle movements
            if (this.currentAnimation !== 'punching' && this.currentAnimation !== 'kicking') {
                this.currentAnimation = 'idle';
            }
            const torsoPos = torso.position;
            
            // Boxing stance - wider, staggered foot position
            if (this.boxingStance) {
                this.footworkTime += deltaTime * 2;
                
                // Subtle weight shifting and bouncing
                const bounce = Math.sin(this.footworkTime) * 0.08;
                const weightShift = Math.sin(this.footworkTime * 0.5) * 0.1;
                
                // Left leg slightly forward in orthodox stance
                this.meshes.leftUpperLeg.position.set(
                    torsoPos.x - 0.25,
                    torsoPos.y - 0.45 + bounce,
                    torsoPos.z + 0.15 + weightShift
                );
                this.meshes.leftUpperLeg.rotation.x = 0.1;
                
                this.meshes.leftLowerLeg.position.set(
                    torsoPos.x - 0.25,
                    torsoPos.y - 1.35 + bounce,
                    torsoPos.z + 0.2 + weightShift
                );
                this.meshes.leftLowerLeg.rotation.x = 0.05;
                
                this.meshes.leftFoot.position.set(
                    torsoPos.x - 0.25,
                    torsoPos.y - 2.0 + bounce * 0.5,
                    torsoPos.z + 0.25 + weightShift
                );
                this.meshes.leftFoot.rotation.x = 0;
                
                // Right leg back in orthodox stance
                this.meshes.rightUpperLeg.position.set(
                    torsoPos.x + 0.25,
                    torsoPos.y - 0.45 + bounce,
                    torsoPos.z - 0.15 - weightShift
                );
                this.meshes.rightUpperLeg.rotation.x = -0.05;
                
                this.meshes.rightLowerLeg.position.set(
                    torsoPos.x + 0.25,
                    torsoPos.y - 1.35 + bounce,
                    torsoPos.z - 0.2 - weightShift
                );
                this.meshes.rightLowerLeg.rotation.x = 0.05;
                
                this.meshes.rightFoot.position.set(
                    torsoPos.x + 0.25,
                    torsoPos.y - 2.0 + bounce * 0.5,
                    torsoPos.z - 0.25 - weightShift
                );
                this.meshes.rightFoot.rotation.x = 0;
            } else {
                // Default neutral standing position
                this.meshes.leftUpperLeg.position.set(torsoPos.x - 0.2, torsoPos.y - 0.45, torsoPos.z);
                this.meshes.leftUpperLeg.rotation.x *= 0.9;
                
                this.meshes.leftLowerLeg.position.set(torsoPos.x - 0.2, torsoPos.y - 1.35, torsoPos.z);
                this.meshes.leftLowerLeg.rotation.x *= 0.9;
                
                this.meshes.leftFoot.position.set(torsoPos.x - 0.2, torsoPos.y - 2.0, torsoPos.z);
                this.meshes.leftFoot.rotation.x *= 0.9;
                
                this.meshes.rightUpperLeg.position.set(torsoPos.x + 0.2, torsoPos.y - 0.45, torsoPos.z);
                this.meshes.rightUpperLeg.rotation.x *= 0.9;
                
                this.meshes.rightLowerLeg.position.set(torsoPos.x + 0.2, torsoPos.y - 1.35, torsoPos.z);
                this.meshes.rightLowerLeg.rotation.x *= 0.9;
                
                this.meshes.rightFoot.position.set(torsoPos.x + 0.2, torsoPos.y - 2.0, torsoPos.z);
                this.meshes.rightFoot.rotation.x *= 0.9;
            }
        }
        
        // Apply head bobbing and weaving for boxing
        this.updateBoxingHeadMovement(deltaTime);
    }
    
    updateBoxingHeadMovement(deltaTime) {
        // Apply subtle head bobbing and weaving when in boxing stance
        if (!this.isKnockedOut && this.boxingStance && this.bodies.head) {
            const head = this.bodies.head;
            const torso = this.bodies.torso;
            
            this.headBobTime += deltaTime * 3;
            
            // Subtle head movement - bobbing (up/down) and weaving (side to side)
            const bobAmount = Math.sin(this.headBobTime) * 0.05;
            const weaveAmount = Math.sin(this.headBobTime * 0.7) * 0.08;
            
            // Apply small forces to create natural head movement
            if (this.currentAnimation === 'idle') {
                const targetPos = new CANNON.Vec3(
                    torso.position.x + weaveAmount,
                    torso.position.y + 1.3 + bobAmount,
                    torso.position.z
                );
                
                const diff = new CANNON.Vec3();
                targetPos.vsub(head.position, diff);
                
                // Gentle force for subtle movement
                head.applyForce(diff.scale(5), head.position);
            }
        }
    }
    
    updateBoxingGuard() {
        // Position arms in boxing guard when idle and not attacking
        if (this.isKnockedOut || this.punchTimer > 0 || this.kickTimer > 0) return;
        
        const leftHand = this.bodies.leftHand;
        const rightHand = this.bodies.rightHand;
        const leftForearm = this.bodies.leftForearm;
        const rightForearm = this.bodies.rightForearm;
        const torso = this.bodies.torso;
        
        if (!leftHand || !rightHand || !torso) return;
        
        // Get facing direction
        const direction = new CANNON.Vec3(0, 0, 1);
        torso.quaternion.vmult(direction, direction);
        
        if (this.boxingStance && this.currentAnimation === 'idle') {
            // Boxing guard position - hands up protecting face
            // Left hand (jab hand) - extended slightly forward
            const leftGuardPos = new CANNON.Vec3(
                torso.position.x - 0.4 + direction.x * 0.3,
                torso.position.y + 0.8,
                torso.position.z - 0.4 + direction.z * 0.3
            );
            
            const leftDiff = new CANNON.Vec3();
            leftGuardPos.vsub(leftHand.position, leftDiff);
            leftHand.applyForce(leftDiff.scale(40), leftHand.position);
            
            // Right hand (power hand) - closer to chin
            const rightGuardPos = new CANNON.Vec3(
                torso.position.x + 0.35 + direction.x * 0.1,
                torso.position.y + 0.9,
                torso.position.z + 0.35 + direction.z * 0.1
            );
            
            const rightDiff = new CANNON.Vec3();
            rightGuardPos.vsub(rightHand.position, rightDiff);
            rightHand.applyForce(rightDiff.scale(40), rightHand.position);
            
            // Position forearms to support guard
            if (leftForearm) {
                const leftForearmPos = new CANNON.Vec3(
                    torso.position.x - 0.3 + direction.x * 0.2,
                    torso.position.y + 0.4,
                    torso.position.z - 0.3 + direction.z * 0.2
                );
                const forearmDiff = new CANNON.Vec3();
                leftForearmPos.vsub(leftForearm.position, forearmDiff);
                leftForearm.applyForce(forearmDiff.scale(25), leftForearm.position);
            }
            
            if (rightForearm) {
                const rightForearmPos = new CANNON.Vec3(
                    torso.position.x + 0.3 + direction.x * 0.05,
                    torso.position.y + 0.5,
                    torso.position.z + 0.3 + direction.z * 0.05
                );
                const forearmDiff = new CANNON.Vec3();
                rightForearmPos.vsub(rightForearm.position, forearmDiff);
                rightForearm.applyForce(forearmDiff.scale(25), rightForearm.position);
            }
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
        
        // During knockout, legs also go ragdoll (spread out)
        if (this.isKnockedOut) {
            const torsoPos = this.bodies.torso.position;
            const torsoRot = this.bodies.torso.quaternion;
            
            // Spread legs outward in knockout pose
            this.meshes.leftUpperLeg.position.set(
                torsoPos.x - 0.3,
                torsoPos.y - 0.6,
                torsoPos.z - 0.2
            );
            this.meshes.leftUpperLeg.rotation.x = Math.PI * 0.3;
            this.meshes.leftUpperLeg.rotation.z = -Math.PI * 0.2;
            
            this.meshes.leftLowerLeg.position.set(
                torsoPos.x - 0.4,
                torsoPos.y - 1.5,
                torsoPos.z - 0.3
            );
            this.meshes.leftLowerLeg.rotation.x = Math.PI * 0.1;
            
            this.meshes.leftFoot.position.set(
                torsoPos.x - 0.5,
                torsoPos.y - 2.1,
                torsoPos.z - 0.4
            );
            
            this.meshes.rightUpperLeg.position.set(
                torsoPos.x + 0.3,
                torsoPos.y - 0.6,
                torsoPos.z + 0.2
            );
            this.meshes.rightUpperLeg.rotation.x = Math.PI * 0.3;
            this.meshes.rightUpperLeg.rotation.z = Math.PI * 0.2;
            
            this.meshes.rightLowerLeg.position.set(
                torsoPos.x + 0.4,
                torsoPos.y - 1.5,
                torsoPos.z + 0.3
            );
            this.meshes.rightLowerLeg.rotation.x = Math.PI * 0.1;
            
            this.meshes.rightFoot.position.set(
                torsoPos.x + 0.5,
                torsoPos.y - 2.1,
                torsoPos.z + 0.4
            );
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
        
        // Check distance from platform center to avoid falling off
        const platformRadius = 14; // Platform is 30x30, stay within safe radius
        const distFromCenter = Math.sqrt(
            this.body.position.x * this.body.position.x +
            this.body.position.z * this.body.position.z
        );
        
        // If near edge, apply force toward center
        if (distFromCenter > platformRadius) {
            const centerDirection = new CANNON.Vec3(
                -this.body.position.x,
                0,
                -this.body.position.z
            );
            centerDirection.normalize();
            
            // Strong force to push back from edge
            const pushForce = 200;
            this.body.applyForce(
                new CANNON.Vec3(centerDirection.x * pushForce, 0, centerDirection.z * pushForce),
                this.body.position
            );
            
            // Also dampen velocity toward edge
            const velocityTowardEdge = 
                this.body.velocity.x * this.body.position.x +
                this.body.velocity.z * this.body.position.z;
            
            if (velocityTowardEdge > 0) {
                // Moving toward edge, slow down
                this.body.velocity.x *= 0.7;
                this.body.velocity.z *= 0.7;
            }
        } else {
            // Safe to move normally
            // Apply horizontal force only to move - no upward force
            const moveForce = 250 * this.speed; // Increased force for reliable movement
            this.body.applyForce(
                new CANNON.Vec3(direction.x * moveForce, 0, direction.z * moveForce),
                this.body.position
            );
        }
        
        // Limit horizontal velocity to prevent excessive speed
        const maxSpeed = 5; // Increased for better movement feel
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
        
        // Boxing footwork - circle around opponent when in range
        if (distance > 2.5 && distance < 4.5 && this.punchTimer === 0 && this.kickTimer === 0) {
            const direction = new CANNON.Vec3();
            this.aiTarget.body.position.vsub(this.body.position, direction);
            direction.y = 0;
            direction.normalize();
            
            // Get perpendicular direction for circling
            const circleDir = new CANNON.Vec3(-direction.z, 0, direction.x);
            
            // Randomly circle left or right
            const circleDirection = Math.random() > 0.5 ? 1 : -1;
            circleDir.scale(circleDirection, circleDir);
            
            // Apply lateral movement force (boxing footwork)
            const lateralForce = 150 * this.speed;
            this.body.applyForce(
                new CANNON.Vec3(circleDir.x * lateralForce, 0, circleDir.z * lateralForce),
                this.body.position
            );
            
            // Also move slightly forward/backward randomly
            const approachRetreat = (Math.random() - 0.5) * 0.3;
            this.body.applyForce(
                new CANNON.Vec3(direction.x * lateralForce * approachRetreat, 0, direction.z * lateralForce * approachRetreat),
                this.body.position
            );
            
            // Keep facing opponent while circling
            const targetAngle = Math.atan2(direction.x, direction.z);
            this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), targetAngle);
        }
        
        // Choose attack when in close range
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
    
    punch(punchType = null) {
        // Determine punch type - use provided or choose based on context
        if (punchType) {
            this.punchType = punchType;
        } else {
            // AI chooses punch type based on combo and random
            const currentTime = this.animationTime;
            const timeSinceLastPunch = currentTime - this.lastPunchTime;
            
            if (timeSinceLastPunch < 1.0 && this.comboCount < 3) {
                // Combo punching - alternate between jab and cross
                this.comboCount++;
                this.punchType = this.comboCount % 2 === 1 ? 'jab' : 'cross';
            } else {
                // Reset combo, choose randomly
                this.comboCount = 1;
                const rand = Math.random();
                if (rand < 0.4) {
                    this.punchType = 'jab';
                } else if (rand < 0.7) {
                    this.punchType = 'cross';
                } else if (rand < 0.85) {
                    this.punchType = 'hook';
                } else {
                    this.punchType = 'uppercut';
                }
            }
            this.lastPunchTime = currentTime;
        }
        
        this.currentAnimation = 'punching';
        
        // Different timing for different punches
        switch (this.punchType) {
            case 'jab':
                this.punchTimer = 12; // Fast jab
                break;
            case 'cross':
                this.punchTimer = 15; // Standard punch
                break;
            case 'hook':
                this.punchTimer = 18; // Wider swing
                break;
            case 'uppercut':
                this.punchTimer = 16; // Powerful uppercut
                break;
            default:
                this.punchTimer = 15;
        }
        
        // Store direction for animation
        const direction = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(direction, direction);
        this.punchDirection = direction.clone();
        
        // Choose which hand based on punch type
        const hand = (this.punchType === 'jab') ? this.bodies.leftHand : this.bodies.rightHand;
        this.punchHand = (this.punchType === 'jab') ? 'left' : 'right';
        
        // Store position for hit check (will be updated during animation)
        if (hand) {
            this.punchHitPos = hand.position.clone();
        }
    }
    
    updatePunchAnimation() {
        // Boxing-style punch with different animations per type
        const isLeftPunch = this.punchHand === 'left';
        const hand = isLeftPunch ? this.bodies.leftHand : this.bodies.rightHand;
        const forearm = isLeftPunch ? this.bodies.leftForearm : this.bodies.rightForearm;
        const upperArm = isLeftPunch ? this.bodies.leftUpperArm : this.bodies.rightUpperArm;
        
        if (!hand || !forearm || !upperArm || !this.punchDirection) return;
        
        const direction = this.punchDirection;
        const halfTime = Math.floor(this.punchTimer / 2);
        
        // Different punch mechanics based on type
        switch (this.punchType) {
            case 'jab':
                this.animateJab(hand, forearm, upperArm, direction, halfTime);
                break;
            case 'cross':
                this.animateCross(hand, forearm, upperArm, direction, halfTime);
                break;
            case 'hook':
                this.animateHook(hand, forearm, upperArm, direction, halfTime);
                break;
            case 'uppercut':
                this.animateUppercut(hand, forearm, upperArm, direction, halfTime);
                break;
            default:
                this.animateCross(hand, forearm, upperArm, direction, halfTime);
        }
        
        // Update hit position at peak extension
        if (this.punchTimer === Math.floor(halfTime * 0.6)) {
            this.punchHitPos = hand.position.clone();
        }
    }
    
    animateJab(hand, forearm, upperArm, direction, halfTime) {
        // Fast, straight punch - minimal wind-up
        if (this.punchTimer > halfTime) {
            // Quick pull back
            const pullBackForce = 180;
            hand.applyForce(
                new CANNON.Vec3(-direction.x * pullBackForce, 0, -direction.z * pullBackForce),
                hand.position
            );
        } else {
            // Explosive straight extension
            const punchForce = 500 * this.strength;
            hand.applyForce(
                new CANNON.Vec3(direction.x * punchForce, 15, direction.z * punchForce),
                hand.position
            );
            forearm.applyForce(
                new CANNON.Vec3(direction.x * punchForce * 0.6, 0, direction.z * punchForce * 0.6),
                forearm.position
            );
        }
    }
    
    animateCross(hand, forearm, upperArm, direction, halfTime) {
        // Power punch with body rotation
        if (this.punchTimer > halfTime) {
            // Wind-up with hip rotation
            const pullBackForce = 250;
            hand.applyForce(
                new CANNON.Vec3(-direction.x * pullBackForce, 0, -direction.z * pullBackForce),
                hand.position
            );
            forearm.applyForce(
                new CANNON.Vec3(-direction.x * pullBackForce * 0.5, 0, -direction.z * pullBackForce * 0.5),
                forearm.position
            );
            // Rotate body for power
            this.body.angularVelocity.y += 0.08;
        } else {
            // Explosive forward with full body rotation
            const punchForce = 700 * this.strength;
            hand.applyForce(
                new CANNON.Vec3(direction.x * punchForce, 20, direction.z * punchForce),
                hand.position
            );
            forearm.applyForce(
                new CANNON.Vec3(direction.x * punchForce * 0.5, 0, direction.z * punchForce * 0.5),
                forearm.position
            );
            upperArm.applyForce(
                new CANNON.Vec3(direction.x * punchForce * 0.3, 0, direction.z * punchForce * 0.3),
                upperArm.position
            );
            this.body.angularVelocity.y -= 0.05; // Counter-rotation
        }
    }
    
    animateHook(hand, forearm, upperArm, direction, halfTime) {
        // Wide, circular punch
        // Get perpendicular direction for hook
        const hookDir = new CANNON.Vec3(-direction.z, 0, direction.x);
        const handSide = (this.punchHand === 'left') ? 1 : -1;
        hookDir.scale(handSide, hookDir);
        
        if (this.punchTimer > halfTime) {
            // Pull back and to the side
            const pullBackForce = 200;
            hand.applyForce(
                new CANNON.Vec3(
                    (-direction.x - hookDir.x) * pullBackForce,
                    0,
                    (-direction.z - hookDir.z) * pullBackForce
                ),
                hand.position
            );
        } else {
            // Swing in arc
            const hookForce = 650 * this.strength;
            hand.applyForce(
                new CANNON.Vec3(
                    (direction.x + hookDir.x) * hookForce,
                    25,
                    (direction.z + hookDir.z) * hookForce
                ),
                hand.position
            );
            forearm.applyForce(
                new CANNON.Vec3(hookDir.x * hookForce * 0.4, 0, hookDir.z * hookForce * 0.4),
                forearm.position
            );
            // Strong body rotation for hook
            this.body.angularVelocity.y += handSide * 0.12;
        }
    }
    
    animateUppercut(hand, forearm, upperArm, direction, halfTime) {
        // Upward punch from low position
        if (this.punchTimer > halfTime) {
            // Crouch and pull back
            const pullBackForce = 220;
            hand.applyForce(
                new CANNON.Vec3(-direction.x * pullBackForce, -150, -direction.z * pullBackForce),
                hand.position
            );
            // Slight crouch
            this.body.applyForce(new CANNON.Vec3(0, -100, 0), this.body.position);
        } else {
            // Explosive upward punch
            const upperForce = 600 * this.strength;
            hand.applyForce(
                new CANNON.Vec3(direction.x * upperForce * 0.3, upperForce * 1.2, direction.z * upperForce * 0.3),
                hand.position
            );
            forearm.applyForce(
                new CANNON.Vec3(direction.x * upperForce * 0.2, upperForce * 0.8, direction.z * upperForce * 0.2),
                forearm.position
            );
            upperArm.applyForce(
                new CANNON.Vec3(0, upperForce * 0.4, 0),
                upperArm.position
            );
            // Rise from crouch
            this.body.applyForce(new CANNON.Vec3(0, 250, 0), this.body.position);
        }
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
        
        // Apply knockback based on damage type - REDUCED to prevent flying
        const direction = new CANNON.Vec3();
        this.body.position.vsub(sourcePos, direction);
        direction.y = 0; // Horizontal direction
        direction.normalize();
        
        // Much lighter knockback - character should swing back, not fly
        const knockbackStrength = amount / 30; // Reduced from /20 to /30
        const horizontalForce = 250 * knockbackStrength * this.strength; // Reduced from 500
        const upwardForce = 80 * knockbackStrength; // Reduced from 200
        
        this.body.applyImpulse(
            new CANNON.Vec3(
                direction.x * horizontalForce,
                upwardForce,
                direction.z * horizontalForce
            ),
            this.body.position
        );
        
        // Minimal rotation from impact - just a slight swing
        const spinForce = knockbackStrength * 0.5; // Reduced from 2
        this.body.angularVelocity.x += (Math.random() - 0.5) * spinForce;
        this.body.angularVelocity.z += (Math.random() - 0.5) * spinForce;
        
        if (this.health <= 0 && !this.isKnockedOut) {
            this.knockout();
        }
        
        // Small chance to dodge/slip punches when in boxing stance
        if (this.boxingStance && Math.random() < 0.15 && !this.isKnockedOut) {
            this.performSlip();
        }
    }
    
    performSlip() {
        // Boxing slip/dodge movement - quick lateral head movement
        if (!this.bodies.head || this.punchTimer > 0 || this.kickTimer > 0) return;
        
        // Quick slip to the side
        const slipDirection = Math.random() > 0.5 ? 1 : -1;
        const slipForce = 300;
        
        // Get facing direction
        const forward = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(forward, forward);
        
        // Perpendicular for slip
        const slipDir = new CANNON.Vec3(-forward.z * slipDirection, 0, forward.x * slipDirection);
        
        // Quick head movement
        this.bodies.head.applyImpulse(
            new CANNON.Vec3(slipDir.x * slipForce, 0, slipDir.z * slipForce),
            this.bodies.head.position
        );
        
        // Slight body lean
        this.body.applyImpulse(
            new CANNON.Vec3(slipDir.x * 50, 0, slipDir.z * 50),
            this.body.position
        );
    }
    
    knockout() {
        this.isKnockedOut = true;
        this.knockoutTimer = 180 + Math.random() * 120; // 3-5 seconds
        this.wakeupProgress = 0;
        this.health = 0;
        this.currentAnimation = 'knockout';
        
        // Dramatic knockout - disable balancing forces
        // Apply dramatic spinning fall
        const spinDirection = Math.random() > 0.5 ? 1 : -1;
        this.body.angularVelocity.set(
            (Math.random() - 0.5) * 4,
            spinDirection * 2,
            (Math.random() - 0.5) * 4
        );
        
        // Remove most of the physics constraints temporarily to allow full ragdoll
        // (They stay in array but we won't apply balancing forces)
        
        // Visual feedback - semi-transparent and darker
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0.7;
                // Darken the material slightly
                if (mesh.material.emissive) {
                    mesh.material.emissive.setHex(0x000000);
                }
            }
        });
        
        // Add "stars" or dizziness effect could be added here
    }
    
    wakeUp() {
        this.isKnockedOut = false;
        this.health = 50;
        this.knockoutTimer = 0;
        this.wakeupProgress = 0;
        this.currentAnimation = 'idle';
        
        // Restore opacity and color
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.material) {
                mesh.material.transparent = false;
                mesh.material.opacity = 1.0;
            }
        });
        
        // Resume balancing - reset angular velocity
        this.body.angularVelocity.set(0, 0, 0);
        
        // Break free if grabbed with explosive force
        if (this.isGrabbed) {
            const grabber = this.game.characters.find(c => c.grabbedTarget === this);
            if (grabber) {
                grabber.releaseGrab();
                
                // Push grabber away
                const pushDirection = new CANNON.Vec3();
                grabber.body.position.vsub(this.body.position, pushDirection);
                pushDirection.normalize();
                grabber.body.applyImpulse(
                    new CANNON.Vec3(
                        pushDirection.x * 300,
                        150,
                        pushDirection.z * 300
                    ),
                    grabber.body.position
                );
            }
            
            // Launch self away from grabber
            this.body.applyImpulse(
                new CANNON.Vec3(
                    (Math.random() - 0.5) * 600,
                    500,
                    (Math.random() - 0.5) * 600
                ),
                this.body.position
            );
        } else {
            // Normal wake-up - small jump to recover
            this.body.applyImpulse(
                new CANNON.Vec3(0, 200, 0),
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
        
        // Calculate throw direction (away from center and outward)
        const direction = new CANNON.Vec3();
        this.grabbedTarget.body.position.vsub(this.body.position, direction);
        direction.y = 0; // Horizontal direction only
        direction.normalize();
        
        // Powerful throw with upward arc for dramatic effect
        const throwStrength = 1200 * this.strength;
        this.grabbedTarget.body.applyImpulse(
            new CANNON.Vec3(
                direction.x * throwStrength,
                -400, // Downward force to ensure they go off platform
                direction.z * throwStrength
            ),
            this.grabbedTarget.body.position
        );
        
        // Add spin for more dramatic effect
        this.grabbedTarget.body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
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
