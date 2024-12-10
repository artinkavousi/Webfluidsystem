# WebGL Fluid System with Advanced Emitters

An enhanced WebGL-based fluid simulation system featuring multiple emitter types and advanced controls. This project extends the classic WebGL fluid simulation with a sophisticated emitter system, providing fine-grained control over fluid behavior and visualization.

## Key Features

### Emitter System
- **Multiple Emitter Types**
  - Point Emitters: Create focused fluid sources
  - Line Emitters: Generate fluid along a line segment
  - Dye Emitters: Add static color effects
- **Fine-Tuned Control**
  - Adjustable force (0.01 - 1.0)
  - Configurable splat radius (0.05 - 1.0)
  - Color customization
  - Position and direction control
- **Optimized Performance**
  - Low-intensity defaults for subtle effects
  - Efficient multi-emitter management
  - Smooth real-time updates

### Simulation Core
- WebGL-powered fluid dynamics
- Real-time pressure and velocity calculations
- Customizable fluid properties
  - Viscosity
  - Diffusion
  - Pressure
  - Velocity

### User Interface
- **Emitter Controls**
  - Type selection dropdown
  - Force and radius sliders
  - Color picker
  - Position/direction inputs
  - Active state toggle
- **Simulation Parameters**
  - Resolution control
  - Performance settings
  - Visual effect toggles

## Getting Started

### Prerequisites
```bash
# Required software
Node.js (v14+)
npm (v6+)
Modern browser with WebGL support
```

### Installation
```bash
# Clone the repository
git clone https://github.com/artinkavousi/Webfluidsystem.git

# Navigate to project directory
cd Webfluidsystem

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage Guide

### Basic Controls
- **Mouse Interaction**
  - Click and drag to add fluid
  - Right-click to change fluid direction
  - Mouse wheel to adjust force

### Emitter Setup
1. Select emitter type from dropdown
2. Adjust emitter properties:
   - Splat Radius: Start with 0.05 for subtle effects
   - Force: Begin at 50 for gentle flow
   - Color: Choose any RGB value
3. Position your emitter using X/Y coordinates
4. Set direction for fluid flow
5. Toggle emitter activation

### Performance Tips
- Start with lower force values (0.05 - 0.1)
- Use smaller splat radius for detailed effects
- Limit active emitters for optimal performance
- Adjust resolution based on device capability

## Development Status

### Current Features
- ✅ Multiple emitter types
- ✅ Customizable emitter properties
- ✅ Real-time parameter adjustment
- ✅ Optimized performance settings

### Planned Improvements
- 🔄 Audio-responsive emitters
- 🔄 Scene management system
- 🔄 Additional rendering modes
- 🔄 Collision mask support

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original WebGL fluid simulation concept
- WebGL and shader programming community
- Open source contributors

## Version History

- v1.0.0-emitters (Current)
  - Enhanced emitter system
  - Multiple emitter types
  - Optimized performance
  - Improved UI controls
