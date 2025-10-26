# TikTok Battle Arena - Feature Documentation

## Game Overview
A 3D physics-based fighting game inspired by Party Animals and Gang Beasts, featuring AI-controlled characters, ragdoll physics, and team-based combat with TikTok gift integration.

## Core Gameplay Features

### 1. Physics-Based Combat System
**Inspired by Party Animals**
- **Ragdoll Physics**: Characters have realistic physics-based movement and collisions
- **Momentum-Based Attacks**: Punches and kicks transfer momentum to opponents
- **Tumbling & Falling**: Characters realistically tumble and fall from impacts
- **Platform Arena**: Central 30x30 unit platform with fall-off mechanics

### 2. AI Character Behavior
**Three Main States:**

#### Seeking State
- Scans for nearest enemy character
- Moves towards enemy using force-based locomotion
- Switches to attack when within 3 units
- Also looks for knocked-out enemies to grab

#### Attacking State
- Performs punch attacks (60% chance) or dropkicks (40% chance)
- Maintains optimal attack distance (2.5 units)
- Cooldown system prevents spam (1-2 seconds between attacks)
- Returns to seeking if enemy moves too far

#### Grabbing State
- Grabs knocked-out enemies automatically
- Carries them towards platform edge
- Throws them off when reaching edge (13+ units from center)
- Releases if enemy wakes up

### 3. Combat Mechanics

#### Punch Attack
- **Damage**: 20 HP
- **Force**: 200 units * strength multiplier
- **Range**: 2.5 units
- **Visual**: Arm swing animation
- **Cooldown**: 1-2 seconds

#### Dropkick Attack
- **Damage**: 35 HP
- **Self-Jump**: 8 units upward velocity
- **Forward Force**: 150 units
- **Target Force**: 300 units * strength multiplier
- **Range**: 3 units (effective hit range)
- **Visual**: Extended legs animation
- **Cooldown**: 1-2 seconds

### 4. Knockout System

#### Knockout Trigger
- Occurs when character health reaches 0
- Initial health: 100 HP
- Character becomes vulnerable and physics-only

#### Knockout Duration
- Base duration: 3-5 seconds (180-300 frames at 60 FPS)
- Visual feedback: Semi-transparent appearance (70% opacity)
- Character cannot perform actions while knocked out

#### Wake-Up Mechanic
- **Natural Recovery**: After knockout timer expires
- **Accelerated Recovery**: When grabbed (2x wake-up speed)
- **Escape Ability**: Upon waking, can break free from grab
- **Health Restoration**: Recovers to 50 HP when waking

### 5. Grab & Throw System
**Party Animals-Inspired Mechanic**

#### Grabbing
- AI automatically grabs knocked-out enemies within 3 units
- Grabbed character follows grabber with offset positioning
- Grabbed character's velocity is dampened
- Only one character can be grabbed at a time

#### Carrying
- Grabber AI moves towards platform edge
- Target: Corner of platform (±15 units from center)
- Grabbed character maintained at 1.5 units behind grabber

#### Throwing
- Triggers when grabber reaches platform edge (>13 units from center)
- Throw force: 400 units in outward and downward direction
- High chance of elimination if character stays knocked out

#### Breaking Free
- Character can wake up while being grabbed
- Wake-up progress: +0.5 per frame when grabbed (vs normal recovery)
- Upon waking: Apply escape force (±200 horizontal, +150 vertical)
- Automatically releases from grab

### 6. Team-Based Gameplay

#### Team Assignment
- **Blue Team**: Spawns on left side (-10 X position)
- **Red Team**: Spawns on right side (+10 X position)
- Team color coding: Blue (#4A90E2) and Red (#E24A4A)

#### Round System
- Round starts when at least one character per team exists
- Round ends when one team is completely eliminated
- Elimination: All team members fallen off platform or eliminated
- Winning team scores 1 point
- Auto-reset: New round starts after 3 seconds

#### Scoring
- Persistent across rounds
- Displayed at top of screen
- No win condition limit (infinite rounds)

### 7. TikTok Gift Integration

#### Spawn Blue Fighter Gift 🎁
- Cost: (To be integrated with TikTok API)
- Effect: Spawns new blue team character
- Spawn location: Left side of platform
- Character has full health (100 HP)

#### Spawn Red Fighter Gift 🎁
- Cost: (To be integrated with TikTok API)
- Effect: Spawns new red team character
- Spawn location: Right side of platform
- Character has full health (100 HP)

#### Power Boost Gift ⚡
- Cost: (To be integrated with TikTok API)
- Effect: Randomly selects one living character
- **Strength Boost**: 2x damage multiplier (10 seconds)
- **Speed Boost**: 1.5x movement speed (10 seconds)
- **Health Boost**: +50 HP (instant)
- **Visual Effect**: Golden glow (emissive material)
- Message displays which team received boost

### 8. Camera System

#### Default Position
- Distance: 40 units from arena center
- Height: 10 units above arena
- Angle: 0.3 radians downward tilt
- Looks at: Arena center (0, 0, 0)

#### Camera Controls
**Mouse Controls:**
- Drag to rotate around arena
- Scroll wheel to zoom in/out
- Rotation limits: ±60° vertical

**Touch Controls:**
- Single finger drag: Rotate camera
- Two finger pinch: Zoom in/out
- Smooth, responsive controls

#### Camera Bounds
- Min distance: 20 units
- Max distance: 80 units
- Vertical angle: -60° to +60°

### 9. Visual Features

#### Lighting
- Ambient light: 60% intensity
- Directional light: 80% intensity, casts shadows
- Hemisphere light: Sky/ground color gradient
- Shadow mapping: Soft shadows (PCF)

#### Materials
- Character bodies: Phong material with team color
- Character heads: Skin tone (#FFDCAB)
- Platform: Brown (#8B4513) with white edge lines
- Power boost: Gold emissive glow

#### Animations (New Keyframe System)
- **Idle**: Breathing, subtle arm movement, head looking around, blinking
- **Walk**: Coordinated arm swings, leg lifts, head bobbing (0.6s cycle)
- **Punch**: Wind-up, extension, follow-through (0.5s)
- **Kick/Dropkick**: Full leg extension with jump motion (0.6s)
- **Knockout**: Dramatic limb spread, lolling head, visible unconscious state (1.5s loop)
- **Smooth Interpolation**: Ease-in-out curves for natural motion
- **State Blending**: Seamless transitions between animation states
- **Secondary Motion**: Physics-based head lean, random blinking, breathing

See `ANIMATION_SYSTEM.md` for detailed documentation.

### 10. Technical Specifications

#### Performance
- Target: 60 FPS
- Physics step: 1/60 second
- Render loop: RequestAnimationFrame

#### Physics Settings
- Gravity: -30 m/s² (strong for dramatic falls)
- Linear damping: 0.3 (slight air resistance)
- Angular damping: 0.5 (reduces spinning)
- Friction: 0.3
- Restitution: 0.3 (slight bounciness)
- Solver iterations: 10

#### Character Stats (Default)
- Health: 100 HP
- Strength: 1.0x multiplier
- Speed: 1.0x multiplier
- Mass: 5 units
- Collision radius: 1.2 units

#### Platform Specs
- Size: 30 x 2 x 30 units
- Position: Y = -5
- Fall detection: Y < -40
- Edge detection: Distance > 13 from center

## Future Enhancement Ideas

### Gameplay
- Multiple arena types (ice, lava, moving platforms)
- Special character types (heavy, speedy, ranged)
- Power-up pickups on platform
- Team size selection
- Time limit mode
- Sudden death mechanics

### Visual
- Particle effects for impacts
- Victory celebrations
- Character customization
- Environmental hazards
- Dynamic weather

### TikTok Integration
- Real TikTok gift API connection
- Viewer voting for team spawns
- Streamer control panel
- Live stats display
- Replay highlights

### Audio
- Impact sound effects
- Character voice clips
- Background music
- Crowd cheering
- Knockout sound

## Game Balance

### Tested Scenarios
✅ 1v1 combat - Balanced, engaging
✅ 2v2 combat - Chaotic, fun
✅ Asymmetric (2v1) - Challenging but fair
✅ Large battles (4v4+) - Very chaotic, entertaining
✅ Power boost impact - Significant but not overpowered

### Balance Considerations
- Knockout duration allows for grab but not guaranteed elimination
- Wake-up mechanic prevents frustrating helplessness
- Dropkick risk/reward (self-launch can backfire)
- Platform size allows maneuvering but enables eliminations
- Spawn positions prevent immediate spawn-camping

## Controls Summary

### Camera
- **Drag/Touch**: Rotate camera
- **Scroll/Pinch**: Zoom in/out

### Game Actions
- **Spawn Blue**: Add blue team fighter
- **Spawn Red**: Add red team fighter  
- **Power Boost**: Give random character boost

### AI (Automatic)
- Movement towards enemies
- Attack selection (punch/dropkick)
- Grab knocked-out enemies
- Throw enemies off platform
- Wake up and escape

All combat and character actions are handled by AI - players only spawn characters and apply boosts!
