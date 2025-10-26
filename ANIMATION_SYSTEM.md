# Animation System Documentation

## Overview

The TikTok Battle Arena now features a smooth, keyframe-based animation system that replaces the previous procedural sine-wave animations. This system provides natural, fluid character movements without the flickering and jittering that plagued the old system.

## Key Improvements

### Before (Procedural Sine-Wave System)
- **Issues**: Limbs used simple `Math.sin()` calculations that updated every frame
- **Problems**: 
  - Jittery, flickering movements
  - No smooth transitions between states
  - Unpredictable animation timing
  - Difficult to control or modify animations
  - Cartoon-like but not in a polished way

### After (Keyframe-Based System)
- **Solution**: Smooth interpolation between predefined keyframes
- **Benefits**:
  - Smooth, natural movements
  - Predictable and controllable animations
  - Easy to add new animation states
  - Professional-looking character motion
  - Blending between animation states

## Animation States

### 1. Idle
- **Duration**: 2.0 seconds (looping)
- **Features**:
  - Subtle breathing motion
  - Gentle arm sway
  - Head looking around
  - Weight shifting in legs
  - Occasional blinking

### 2. Walk
- **Duration**: 0.6 seconds (looping)
- **Features**:
  - Dramatic arm swings (front-to-back motion)
  - High knee lifts for visibility
  - Head bobbing synchronized with steps
  - Natural stride cycle
  - Speed-adaptive timing

### 3. Punch
- **Duration**: 0.5 seconds (one-shot)
- **Features**:
  - Wind-up phase
  - Quick extension
  - Follow-through
  - Return to neutral

### 4. Kick (Dropkick)
- **Duration**: 0.6 seconds (one-shot)
- **Features**:
  - Both legs extend
  - Dramatic jumping motion
  - Full body commitment
  - Airborne phase

### 5. Knockout
- **Duration**: 1.5 seconds (looping)
- **Features**:
  - Arms spread wide
  - Legs splayed
  - Head lolling
  - Visible unconscious state
  - Slow wobbling motion

## Technical Implementation

### Keyframe Structure

Each animation state consists of keyframes with:
- **Time**: When the keyframe occurs in the animation cycle
- **Rotation**: XYZ Euler angles for each limb
- **Position**: XYZ coordinates relative to the body

```javascript
{
    duration: 0.6,
    loop: true,
    keyframes: {
        leftArm: [
            { time: 0.0, rotation: { x: 1.0, y: 0, z: Math.PI / 4 }, position: { x: -1.1, y: 0.5, z: -0.4 } },
            { time: 0.3, rotation: { x: -1.0, y: 0, z: Math.PI / 4 }, position: { x: -1.1, y: 0.5, z: 0.4 } },
            { time: 0.6, rotation: { x: 1.0, y: 0, z: Math.PI / 4 }, position: { x: -1.1, y: 0.5, z: -0.4 } }
        ],
        // ... other body parts
    }
}
```

### Interpolation

The system uses **ease-in-out** interpolation for smooth transitions:

```javascript
const smoothT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
```

This creates natural acceleration and deceleration, avoiding robotic movements.

### Animation Blending

Characters smoothly transition between animation states:
- When state changes, blend value resets to 0
- Blend increases over time (3x per second)
- At blend = 1.0, the new state becomes active

### Secondary Motion

Additional subtle animations layer on top:
- **Breathing**: Sine wave affecting head position
- **Blinking**: Random chance per frame (0.5%)
- **Head Physics**: Lean based on velocity direction
- **Eye Movement**: Subtle position shifts

## Body Parts

The animation system controls:
- `leftArm` - Left arm rotation and position
- `rightArm` - Right arm rotation and position
- `leftLeg` - Left leg rotation and position
- `rightLeg` - Right leg rotation and position
- `head` - Head rotation and position

Each part has independent keyframes allowing for complex, coordinated movements.

## State Selection Logic

Animation state is automatically selected based on character status:

```javascript
if (isKnockedOut) {
    state = 'knockout';
} else if (speed > 0.5) {
    state = 'walk';
} else {
    state = 'idle';
}
```

## Performance Considerations

- **Interpolation**: Calculated once per frame per body part
- **Memory**: Keyframe data stored as plain objects
- **CPU**: Minimal - just linear interpolation math
- **GPU**: Standard Three.js mesh updates

## Future Enhancements

Potential additions to the animation system:

### New Animation States
- `run` - Faster movement animation
- `jump` - Jumping motion
- `grab` - Grabbing knocked-out opponent
- `throw` - Throwing opponent
- `celebrate` - Victory animation
- `damaged` - Hit reaction

### Advanced Features
- **Animation Events**: Trigger actions at specific keyframes
- **IK (Inverse Kinematics)**: Feet always touch ground
- **Animation Layers**: Combine upper/lower body animations
- **Blend Trees**: Multiple animations blending simultaneously
- **Animation Masks**: Animate only specific body parts

### Mixamo Integration
While the current system works well, adding Mixamo support would enable:
- Professional mocap-quality animations
- Hundreds of pre-made animations
- Easy animation authoring in Mixamo editor
- Industry-standard FBX/GLTF export

To add Mixamo models:
1. Export character as FBX/GLTF from Mixamo
2. Load using `GLTFLoader` in Three.js
3. Extract animation clips
4. Use `AnimationMixer` to play clips
5. Blend between clips for smooth transitions

## Code Examples

### Creating a New Animation State

```javascript
this.animationKeyframes.newState = {
    duration: 1.0,
    loop: true,
    keyframes: {
        leftArm: [
            { time: 0.0, rotation: { x: 0, y: 0, z: 0 }, position: { x: -1.1, y: 0.5, z: 0 } },
            { time: 1.0, rotation: { x: 0, y: 0, z: 0 }, position: { x: -1.1, y: 0.5, z: 0 } }
        ]
    }
};
```

### Triggering an Animation

```javascript
this.animationState = 'punch';
this.animationTime = 0;
```

### Adjusting Animation Speed

Modify the duration multiplier in `updateAnimation()`:
```javascript
this.animationTime += deltaTime * speedMultiplier;
```

## Best Practices

1. **Keyframe Timing**: Space keyframes evenly for predictable motion
2. **Loop Animations**: First and last keyframes should match
3. **Rotation Limits**: Keep rotations within natural ranges
4. **Position Constraints**: Limbs shouldn't intersect the body
5. **Testing**: View animations from multiple camera angles

## Conclusion

The new animation system provides smooth, professional-quality character animations that are easy to author, modify, and extend. The keyframe-based approach is battle-tested in the game industry and provides the foundation for future enhancements including Mixamo integration.

---

*Last Updated: October 26, 2024*
