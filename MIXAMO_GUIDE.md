# Using Mixamo Characters

## Overview

The game now supports loading actual 3D character models from Mixamo with full skeletal animations. This guide explains how to use Mixamo models in the game.

## Quick Start

### 1. Get a Mixamo Account (Free)

Go to https://www.mixamo.com and sign in with an Adobe account (free to create).

### 2. Download a Character

1. Browse the Characters section
2. Select a character you like (e.g., "Y Bot" is a good default)
3. Click "Download"
4. Select format: **GLB** (recommended) or FBX for Unity
5. Download the character

### 3. Download Animations

For each animation you want:
1. Select your character in Mixamo
2. Browse Animations
3. Select an animation (e.g., "Idle", "Walking", "Punching")
4. Adjust settings if needed
5. Download as **GLB** format
6. Select "With Skin" to include the character model

Recommended animations:
- **Idle**: For standing still
- **Walking**: For movement
- **Running**: For faster movement (optional)
- **Punching**: For attack moves
- **Kick**: For dropkick attack
- **Hit Reaction**: For taking damage
- **Dying**: For knockout state
- **Falling**: For falling off platform

### 4. Add Models to Game

1. Place downloaded `.glb` files in the `models/` directory
2. Name them clearly, e.g.:
   - `character.glb` - Base character
   - `idle.glb` - Idle animation
   - `walk.glb` - Walking animation
   - `punch.glb` - Punching animation
   - etc.

### 5. Update Game Code

Option A: Use the MixamoLoader (automated):

```javascript
// In game.js init()
this.mixamoLoader = new MixamoLoader(this);

// Load a character model
this.mixamoLoader.loadModel(
    'models/character.glb',
    (model) => {
        console.log('Character loaded!', model);
        // Model is now available for spawning characters
    },
    (progress) => {
        console.log('Loading:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('Error loading model:', error);
    }
);
```

Option B: Manual integration:

```javascript
// Load with THREE.GLTFLoader
const loader = new THREE.GLTFLoader();
loader.load('models/character.glb', (gltf) => {
    const model = gltf.scene;
    const animations = gltf.animations;
    // Use model in your character class
});
```

## Current System

The game currently uses **procedural humanoid models** that work out of the box without needing to download anything. These are compatible with the Mixamo bone structure, so switching to actual Mixamo models is straightforward.

### Benefits of Current System:
- ✅ No downloads needed
- ✅ Works immediately
- ✅ Mixamo-compatible bone structure
- ✅ Smooth animations
- ✅ Small file size

### Benefits of Mixamo Models:
- ✅ Professional 3D models
- ✅ High-quality animations
- ✅ Customizable appearance
- ✅ More character variety
- ✅ Better visual appeal

## Character Configuration

### Scaling

Mixamo models come in different sizes. The MixamoLoader automatically scales them to fit the game (3 units tall), but you can adjust:

```javascript
characterModel.scale.set(0.01, 0.01, 0.01); // Adjust as needed
```

### Materials

Apply team colors to the model:

```javascript
model.traverse((child) => {
    if (child.isMesh) {
        child.material.color.set(teamColor); // Blue or red
    }
});
```

### Animations

Play an animation:

```javascript
const mixer = new THREE.AnimationMixer(model);
const action = mixer.clipAction(animations[0]);
action.play();

// In update loop:
mixer.update(deltaTime);
```

## Animation Mapping

Map Mixamo animations to game states:

| Game State | Recommended Mixamo Animation |
|-----------|------------------------------|
| Idle | Idle, Breathing Idle |
| Walking | Walking, Walk Forward |
| Running | Running, Run Forward |
| Punching | Punching, Boxing |
| Kicking | Kick, Roundhouse Kick |
| Knocked Out | Dying, Death, Falling Back |
| Getting Hit | Hit Reaction, Pain |
| Grabbed | Being Carried (custom) |

## Bone Mapping

Standard Mixamo bones that the game uses:

- **Hips** - Root bone, main control point
- **Spine** - Lower spine
- **Spine1** - Mid spine
- **Spine2** - Upper spine/chest
- **Neck** - Neck connection
- **Head** - Head bone
- **LeftShoulder** / **RightShoulder** - Shoulder joints
- **LeftArm** / **RightArm** - Upper arms
- **LeftForeArm** / **RightForeArm** - Lower arms
- **LeftHand** / **RightHand** - Hands
- **LeftUpLeg** / **RightUpLeg** - Upper legs/thighs
- **LeftLeg** / **RightLeg** - Lower legs/shins
- **LeftFoot** / **RightFoot** - Feet

## Troubleshooting

### Model not loading
- Check file path is correct
- Ensure GLTFLoader is loaded (check browser console)
- Verify `.glb` file is valid (open in a 3D viewer)

### Model too big/small
- Adjust scale: `model.scale.set(x, x, x)`
- The loader auto-scales to 3 units tall

### Animations not playing
- Check mixer.update(deltaTime) is called each frame
- Verify animation names match: `console.log(gltf.animations)`
- Ensure action.play() is called

### Model has wrong color
- Make sure to traverse and update materials
- Clone materials before modifying: `material = material.clone()`

### Performance issues
- Use simpler models (lower poly count)
- Limit number of characters on screen
- Use LOD (Level of Detail) for distant characters

## Example: Complete Integration

```javascript
class MixamoCharacter extends AnimatedCharacter {
    constructor(game, team, modelData) {
        super(game, team);
        
        // Replace procedural model with Mixamo model
        this.rootGroup.remove(this.characterMesh);
        
        // Add Mixamo model
        this.mixamoModel = modelData.model;
        this.mixamoMixer = modelData.mixer;
        this.mixamoAnimations = modelData.animations;
        
        this.mixamoModel.scale.setScalar(modelData.scale);
        this.rootGroup.add(this.mixamoModel);
        
        // Map bones
        this.bones = modelData.bones;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update Mixamo animations
        if (this.mixamoMixer) {
            this.mixamoMixer.update(deltaTime);
        }
    }
    
    playMixamoAnimation(name) {
        if (!this.mixamoAnimations[name]) return;
        
        // Stop current animation
        if (this.currentMixamoAction) {
            this.currentMixamoAction.fadeOut(0.2);
        }
        
        // Play new animation
        this.currentMixamoAction = this.mixamoAnimations[name];
        this.currentMixamoAction.reset().fadeIn(0.2).play();
    }
}
```

## Resources

- **Mixamo**: https://www.mixamo.com
- **Three.js GLTF Loader**: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- **GLTF Validator**: https://github.khronos.org/glTF-Validator/
- **Model Viewers**: 
  - Blender (free, powerful)
  - Microsoft 3D Viewer (Windows)
  - Online GLTF Viewer: https://gltf-viewer.donmccurdy.com/

## Next Steps

1. Download a Mixamo character
2. Get a few animations
3. Test loading in a simple scene
4. Integrate with AnimatedCharacter class
5. Polish and optimize

The current system works great with procedural models. Mixamo models are an optional enhancement for better visuals!
