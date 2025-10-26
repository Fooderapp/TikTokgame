# Hybrid Character System

## Overview

The HybridCharacter system implements a physics-based character with active animations, designed to match the gameplay feel of Gang Beasts and Party Animals.

## Architecture

The system uses a **hybrid approach** combining the best of both physics and animation:

### 1. Self-Balancing Capsule (Main Body)
- **Physics Body**: Single cylinder shape for the torso
- **Active Balancing**: Motor forces keep the character upright
- **Balance Disables**: When knocked out, the character becomes full ragdoll

### 2. Ragdoll Arms (Physics-Driven)
- **Upper Arms**: Connected to torso with ball joints
- **Forearms**: Connected to upper arms with hinge joints
- **Hands**: Connected to forearms with ball joints
- **Purpose**: Realistic punching and grabbing physics

### 3. Animated Legs (Visual Only)
- **No Physics Bodies**: Legs are purely visual meshes
- **Walking Animation**: Synchronized leg swing during movement
- **Idle Stance**: Natural standing pose when stationary

### 4. Active Head
- **Physics Body**: Sphere connected to torso
- **Natural Movement**: Follows body motion realistically

## Key Features

### Balance System
```javascript
applyBalanceForces() {
    // Keep character upright with motor forces
    // Correct rotation to stay vertical
    // Disable when knocked out
}
```

### Combat Mechanics
- **Punch**: Forces applied to hands for realistic arm swinging
- **Dropkick**: Jump force + forward momentum
- **Hit Detection**: Sphere-based collision checking

### Knockout States
- **Active**: Character stands upright, fights actively
- **Knocked Out**: All balance motors disable, full ragdoll
- **Recovery**: Gradually returns to active state

## Mixamo Compatibility

The bone structure matches Mixamo rig naming:
- Hips (root)
- Spine, Chest
- Neck, Head
- LeftUpperArm, LeftForearm, LeftHand
- RightUpperArm, RightForearm, RightHand
- LeftUpperLeg, LeftLowerLeg, LeftFoot
- RightUpperLeg, RightLowerLeg, RightFoot

## Usage

The game automatically uses HybridCharacter when `useHybridCharacters` is set to `true` in game.js:

```javascript
this.useHybridCharacters = true; // Enable hybrid system
```

## Comparison with Other Systems

| Feature | AnimatedCharacter | PhysicsCharacter | HybridCharacter |
|---------|-------------------|------------------|-----------------|
| Visual Quality | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Physics Realism | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Animation Quality | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Combat Feel | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Performance | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

## Advantages

1. **Realistic Combat**: Arms use physics for natural punching
2. **Stable Movement**: Self-balancing capsule prevents excessive wobbling
3. **Clear Animations**: Leg animations clearly show movement intent
4. **Knockout Visual**: Full ragdoll provides clear knocked-out state
5. **Mixamo Ready**: Can swap in actual 3D models easily

## Future Enhancements

- Add IK (Inverse Kinematics) for better foot placement
- Implement grab constraints for carrying opponents
- Add more animation states (jumping, falling, celebrating)
- Integrate actual Mixamo GLTF models
- Add facial expressions for emotional feedback
