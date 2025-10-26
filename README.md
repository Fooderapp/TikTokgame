# TikTok Battle Arena - 3D Physics Fighter

A 3D physics-based fighting game inspired by Party Animals and Gang Beasts, featuring AI-controlled characters, ragdoll physics, and TikTok gift integration.

## Features

### Core Mechanics
- **3D Physics-Based Combat**: Realistic ragdoll physics using Cannon.js
- **AI-Driven Characters**: Smart AI that seeks enemies, attacks, and grabs knocked-out opponents
- **Team-Based Gameplay**: Blue team vs Red team with round-based scoring
- **Dynamic Combat System**:
  - **Punch**: Quick melee attacks that damage and push opponents
  - **Dropkick**: Powerful jumping kicks with high knockback
  - **Knockout State**: Characters can be knocked out and become vulnerable
  - **Grab & Throw**: Grab knocked-out enemies and throw them off the platform
  - **Wake-Up & Escape**: Characters can recover from knockout and break free from grabs

### Game Flow
1. Characters spawn on opposite sides of the platform
2. AI automatically seeks and engages enemies
3. Combat involves punching, dropkicking, and strategic positioning
4. Knocked-out characters can be grabbed and thrown off the platform
5. Characters that wake up can break free from grabs
6. Round ends when one team is eliminated
7. Winning team scores a point
8. New round begins automatically

### TikTok Gift Integration
- **🎁 Spawn Blue Fighter**: Add a new blue team member to the battle
- **🎁 Spawn Red Fighter**: Add a new red team member to the battle
- **⚡ Power Boost**: Give a random character increased strength and speed

## Technical Details

### Viewport
- **Resolution**: 1080x1920 (portrait orientation for mobile)
- **Responsive**: Works on desktop and mobile devices

### Physics
- **Engine**: Cannon.js for realistic physics simulation
- **Gravity**: Strong gravity for fun, chaotic physics
- **Ragdoll Characters**: Multi-part character models with connected limbs
- **Platform**: Central arena with fall-off detection

### Controls
- **Camera**: Drag to rotate, pinch/scroll to zoom
- **AI-Controlled**: All characters fight automatically
- **Gift Buttons**: Spawn characters and apply power-ups

## Setup & Running

### Quick Start
1. Clone the repository
2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
3. No build process or dependencies required - runs directly in browser!

### Files
- `index.html` - Main HTML structure and UI
- `game.js` - Game logic, physics, AI, and combat systems
- External libraries loaded via CDN:
  - Three.js (r128) - 3D rendering
  - Cannon.js (0.6.2) - Physics engine

## How to Play

1. **Start**: Open the game in your browser
2. **Spawn Characters**: Click gift buttons to add fighters to each team
3. **Watch the Battle**: AI characters fight automatically
4. **Power Boost**: Click the power boost button to give a random character enhanced abilities
5. **Win Rounds**: Eliminate the opposing team to score points

## Game Mechanics Deep Dive

### AI Behavior
Characters have three main states:
- **Seeking**: Looking for enemies and moving towards them
- **Attacking**: Close-range combat with punches and dropkicks
- **Grabbing**: Holding knocked-out enemies and moving to platform edge

### Combat System
- **Damage**: Punches deal 20 damage, dropkicks deal 35 damage
- **Knockout**: Characters are knocked out at 0 health
- **Recovery**: Knocked-out characters wake up after 3-5 seconds
- **Grab Escape**: Characters wake up faster when grabbed and can break free

### Physics Features
- Realistic ragdoll physics with connected body parts
- Strong gravity for proper ground contact
- Platform edge detection
- Momentum-based combat with realistic knockback
- Stable character movement - no jumping or bouncing
- Head stabilization with dual constraints
- Arm stability with rest position forces
- Smooth walking with velocity limiting
- Enhanced knockout with dramatic falls
- Powerful grab and throw mechanics

### Animation System
- **Keyframe-Based**: Smooth interpolation between animation states
- **State Management**: Idle, walk, punch, kick, knockout animations
- **Walking**: Proper foot placement with lift/plant phases, knee bending, natural stride
- **Punch (Boxing)**: Wind-up phase (pull back) → Extension phase (explosive forward) → Follow-through
- **Dropkick**: Three-phase animation (jump → extend legs/lunge → landing)
- **Knockout**: Dramatic spinning fall with full ragdoll physics
- **Blending**: Seamless transitions between animation states
- **Secondary Motion**: Physics-based head stability, arm rest positions
- **No Jittering**: Characters walk smoothly on platform without jumping or bouncing

## Customization

You can easily modify game parameters in `game.js`:
- Character stats (health, strength, speed)
- Platform size and position
- Gravity strength
- AI behavior timings
- Damage values
- Knockout durations

## Browser Compatibility

Works best in modern browsers with WebGL support:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential additions:
- Multiple arena types
- Different character types with unique abilities
- Power-up pickups on the platform
- Time limit mode
- Tournament mode with multiple rounds
- Visual effects for impacts and knockouts
- Sound effects and music
- Real TikTok gift API integration

## Credits

Inspired by:
- Party Animals - Recreate Games
- Gang Beasts - Boneloaf

Built with:
- Three.js for 3D graphics
- Cannon.js for physics
- Vanilla JavaScript