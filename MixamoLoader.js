// Mixamo Model Loader
// Loads and configures GLTF models from Mixamo with animations

class MixamoLoader {
    constructor(game) {
        this.game = game;
        this.loader = new THREE.GLTFLoader();
        this.loadedModels = {};
        this.animations = {};
    }
    
    /**
     * Load a Mixamo character model
     * @param {string} modelPath - Path to the GLTF/GLB file
     * @param {Function} onLoad - Callback when model is loaded
     * @param {Function} onProgress - Progress callback
     * @param {Function} onError - Error callback
     */
    loadModel(modelPath, onLoad, onProgress, onError) {
        this.loader.load(
            modelPath,
            (gltf) => {
                // Process the loaded model
                const model = this.processMixamoModel(gltf);
                this.loadedModels[modelPath] = model;
                
                if (onLoad) {
                    onLoad(model);
                }
            },
            onProgress,
            onError
        );
    }
    
    /**
     * Process a loaded Mixamo model to make it game-ready
     * @param {Object} gltf - The loaded GLTF object
     * @returns {Object} Processed model with animations and bones mapped
     */
    processMixamoModel(gltf) {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Enable shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Find the skeleton
        let skinnedMesh = null;
        model.traverse((child) => {
            if (child.isSkinnedMesh) {
                skinnedMesh = child;
            }
        });
        
        // Map Mixamo bone names to our system
        const boneMap = this.createMixamoBoneMap(skinnedMesh);
        
        // Create animation mixer
        const mixer = new THREE.AnimationMixer(model);
        
        // Process animations
        const animationActions = {};
        for (const clip of animations) {
            const action = mixer.clipAction(clip);
            animationActions[clip.name.toLowerCase()] = action;
        }
        
        return {
            model: model,
            skinnedMesh: skinnedMesh,
            mixer: mixer,
            animations: animationActions,
            bones: boneMap,
            scale: this.calculateOptimalScale(skinnedMesh)
        };
    }
    
    /**
     * Map Mixamo bone names to standard names
     * @param {THREE.SkinnedMesh} skinnedMesh - The skinned mesh with skeleton
     * @returns {Object} Bone map
     */
    createMixamoBoneMap(skinnedMesh) {
        if (!skinnedMesh || !skinnedMesh.skeleton) {
            return {};
        }
        
        const bones = skinnedMesh.skeleton.bones;
        const boneMap = {};
        
        // Common Mixamo bone names
        const mixamoBoneNames = {
            'Hips': 'hips',
            'Spine': 'spine',
            'Spine1': 'spine1',
            'Spine2': 'spine2',
            'Neck': 'neck',
            'Head': 'head',
            'LeftShoulder': 'leftShoulder',
            'LeftArm': 'leftArm',
            'LeftForeArm': 'leftForearm',
            'LeftHand': 'leftHand',
            'RightShoulder': 'rightShoulder',
            'RightArm': 'rightArm',
            'RightForeArm': 'rightForearm',
            'RightHand': 'rightHand',
            'LeftUpLeg': 'leftUpLeg',
            'LeftLeg': 'leftLeg',
            'LeftFoot': 'leftFoot',
            'RightUpLeg': 'rightUpLeg',
            'RightLeg': 'rightLeg',
            'RightFoot': 'rightFoot'
        };
        
        for (const bone of bones) {
            const standardName = mixamoBoneNames[bone.name];
            if (standardName) {
                boneMap[standardName] = bone;
            }
        }
        
        return boneMap;
    }
    
    /**
     * Calculate optimal scale for the model to fit our game
     * @param {THREE.SkinnedMesh} skinnedMesh - The skinned mesh
     * @returns {number} Scale factor
     */
    calculateOptimalScale(skinnedMesh) {
        if (!skinnedMesh) return 1.0;
        
        // Calculate bounding box
        const bbox = new THREE.Box3().setFromObject(skinnedMesh);
        const height = bbox.max.y - bbox.min.y;
        
        // We want characters to be about 3 units tall
        const targetHeight = 3.0;
        return targetHeight / height;
    }
    
    /**
     * Create a character instance from a loaded model
     * @param {string} modelPath - Path to the model
     * @param {string} team - Team color
     * @returns {Object} Character data
     */
    createCharacterFromModel(modelPath, team) {
        const modelData = this.loadedModels[modelPath];
        if (!modelData) {
            console.error(`Model not loaded: ${modelPath}`);
            return null;
        }
        
        // Clone the model for this character instance
        const characterModel = modelData.model.clone();
        
        // Apply team color
        const teamColor = team === 'blue' ? 0x4A90E2 : 0xE24A4A;
        characterModel.traverse((child) => {
            if (child.isMesh && child.material) {
                // Tint the material with team color
                const originalColor = child.material.color.clone();
                child.material = child.material.clone();
                child.material.color.lerp(new THREE.Color(teamColor), 0.5);
            }
        });
        
        // Create new mixer for this instance
        const mixer = new THREE.AnimationMixer(characterModel);
        
        // Clone animations
        const animations = {};
        for (const [name, action] of Object.entries(modelData.animations)) {
            animations[name] = mixer.clipAction(action.getClip());
        }
        
        return {
            model: characterModel,
            mixer: mixer,
            animations: animations,
            bones: this.createMixamoBoneMap(characterModel.getObjectByProperty('type', 'SkinnedMesh')),
            scale: modelData.scale
        };
    }
    
    /**
     * Get list of available animation names for a model
     * @param {string} modelPath - Path to the model
     * @returns {Array} Array of animation names
     */
    getAvailableAnimations(modelPath) {
        const modelData = this.loadedModels[modelPath];
        if (!modelData) {
            return [];
        }
        return Object.keys(modelData.animations);
    }
}

// Make GLTFLoader available if not already loaded
if (typeof THREE.GLTFLoader === 'undefined') {
    console.warn('GLTFLoader not found. Loading from CDN...');
    
    // Dynamically load GLTFLoader
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    document.head.appendChild(script);
}
