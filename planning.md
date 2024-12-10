Below is a comprehensive and structured planning prompt (optimized as instructions for a Cursor AI environment and suitable as `.cursorrules` content) to guide the development of a fully functional advanced fluid simulation emitter system. It includes integrating multiple emitter types, advanced rendering modes, UI/UX customizations, scene management, modular design, error handling, and extensibility. The goal is to replicate and integrate capabilities inspired by the provided documentation, ensuring a robust, interactive, and user-friendly design.

---

### Overview

We aim to create a modular and extensible Advanced Fluid Simulation system with multiple emitters (line, point, dye) and a powerful control interface. The system should incorporate all features detailed in the provided documentation link and images. The final result will have:

- Multiple emitter support (line, point, dye) within a single scene.
- Full UI panels for customization of each emitter and global simulation parameters.
- Rendering options (Gradient, Emitter Color, Background Color, Distortion).
- Perspective manipulation and collision masks.
- Audio-responsiveness for dynamic emitter behavior.
- Scene management tools to handle interactions between multiple fluid elements.
- Clear, modular code structure that does not interfere with the core simulation logic.

We will use a step-by-step approach to ensure clarity and maintainability.

---

### Step-by-Step Planning

#### Section 1: Core Architecture Setup

1. **Create a Central Simulation Manager:**
   - Implement a `SimulationManager` class that initializes and manages the fluid simulation state.
   - This manager should have methods for:
     - Initializing the simulation environment.
     - Updating global simulation properties (viscosity, dissipation, saturation, gravity, etc.).
     - Rendering the fluid according to the chosen mode.
     - Applying perspective transformations, collision masks, and background opacity.
   - Ensure the manager is decoupled from UI code and can be tested independently.

2. **Emitter Base Class:**
   - Define a `BaseEmitter` abstract class that includes:
     - Common properties (position, size, emission rate, direction, color).
     - Update and render methods.
     - Hooks for audio-responsiveness and SceneScript bindings.
   - This sets the foundation for line, point, and dye emitters to maintain consistent interfaces.

3. **Emitter Subclasses:**
   - **LineEmitter**: Emitter with a defined start and end point emitting fluid along a line segment.
   - **PointEmitter**: Single coordinate point source for fluid emission.
   - **DyeEmitter**: Static color "painted" emitters that can interact with gravity and mouse inputs but remain stationary.
   - Each subclass overrides necessary methods from `BaseEmitter` and implements unique logic (e.g., line geometry updates, point emission angle control, dye static behavior).

4. **SceneGraph / Scene Manager:**
   - Implement a `SceneManager` that:
     - Holds references to all emitters (line, point, dye) and simulation parameters.
     - Coordinates updates between simulation state and UI input.
     - Manages adding/removing emitters dynamically.
     - Interfaces with collision masks and perspective tools.
   - The `SceneManager` should provide a high-level API for external tools or UI components to create, configure, and delete emitters without directly manipulating core simulation code.

---

#### Section 2: Rendering and Visual Customizations

1. **Rendering Modes:**
   - Integrate multiple rendering modes into `SimulationManager`:
     - **Gradient**: Load and apply a gradient map for fluid colorization.
     - **Emitter Color**: Assign unique colors per emitter. Blend the emitted fluid colors naturally in the simulation.
     - **Background Color**: Use the underlying background color as simulation color source.
     - **Distortion**: Apply a distortion shader pass to the rendered fluid to create refractive effects.
   - Provide a UI dropdown or radio buttons to switch between these modes at runtime.

2. **Blend Mode and Opacity Controls:**
   - Implement blend mode options (Normal, Add, etc.) at the rendering pipeline stage.
   - Add sliders for brightness, feather, and opacity adjustments.
   - Ensure these changes apply in real-time without restarting the simulation.

3. **Perspective Controls:**
   - Integrate on-screen handles to adjust the perspective of the fluid layer.
   - Sync the perspective transformation with a properties panel allowing numeric adjustments.
   - Ensure perspective and distortion modes can co-exist without visual conflicts.

4. **Collision Masks:**
   - Provide a UI or drawing tool to create collision masks.
   - Integrate these masks into the simulation update loop so fluid respects boundaries.
   - Allow toggling collision masks on/off and quickly updating them without code modifications.

---

#### Section 3: Emitter Configuration and Interaction

1. **Emitter Counts and Types:**
   - From the UI, allow adding/removing multiple line and point emitters.
   - Provide separate sections for each emitter type:
     - **Line Emitter Count**: Increment/decrement the number of line emitters.
     - **Point Emitter Count**: Increment/decrement the number of point emitters.
   - Dynamically generate UI panels for each emitter instance (e.g., Emitter 1, Emitter 2, etc.), ensuring no conflicts or overlapping controls.

2. **Emitter Property Controls:**
   - For each emitter, provide UI elements for:
     - Position (x, y) with direct numeric input and draggable on-canvas handles.
     - Size and Emission Rate with sliders.
     - Direction (angle) adjustments with a dial or numeric field.
     - Color selection (if Emitter Color mode is active).
   - Integrate undo/redo functionalities for adjustments to streamline the creative workflow.

3. **Advanced Simulation Parameters:**
   - Global controls for Curling, Pressure, High Pass Filter, Viscosity, Dissipation, Saturation.
   - Gravity direction and strength sliders or XY directional inputs.
   - Cursor influence slider and toggle.
   - Ensure all parameter changes are reflected in real-time.

---

#### Section 4: Audio-Responsiveness and Binding Scripts

1. **SceneScript Integration:**
   - Provide a script binding interface for each emitter property (Size, Emission Rate, Color, etc.).
   - Include a snippet manager to quickly inject audio-responsive scripts.
   - Ensure that, when bound, the UI shows the audio factor options (Min, Max, Frequency, Response).

2. **Audio-Responsive Emitter Behavior:**
   - For selected emitters, allow binding their Size (or Emission Rate) to audio input.
   - Provide a visual equalizer or indicator in the UI to preview audio responsiveness.
   - Ensure code handles edge cases gracefully (e.g., no audio playing, zero frequency).

---

#### Section 5: Modularity, Error Handling, and Optimization

1. **Separation of Concerns:**
   - Keep simulation logic in its own module/class.
   - UI components should only call public methods on `SceneManager` and `SimulationManager`.
   - Emitters update separately; the scene manager orchestrates their interactions.

2. **Error Handling:**
   - Validate emitter configuration parameters before applying them.
   - Provide UI feedback (warnings, highlights) if invalid values are entered.
   - Handle missing gradient maps, invalid perspective transforms, or collision mask data gracefully (revert to defaults or prompt the user).

3. **Performance Considerations:**
   - Optimize simulation updates to handle multiple emitters without stutter.
   - Cache UI changes and apply them on the next simulation frame rather than continuously.
   - Allow toggling off heavy features (distortion, multiple collision masks) for performance testing.

---

#### Section 6: User Interface and User Experience

1. **Centralized Control Panel:**
   - A main panel that lists all emitters and global controls.
   - Tabs or collapsible sections for each emitter type and global simulation properties.
   - Live previews of gradient maps and emitter colors.

2. **Interactive On-Canvas Controls:**
   - Draggable handles for line and point emitters.
   - Hover tooltips describing parameters.
   - Keyboard shortcuts for quick parameter resets.

3. **Modular UI Components:**
   - Reusable sliders, color pickers, and dropdown menus that can be easily repurposed for new features.
   - A “Reset to Default” button for global and per-emitter parameters.

---

#### Section 7: Extensibility and Future Improvements

1. **Flexible Additions:**
   - Code structure should allow adding new emitter types (e.g., circular area emitters) with minimal modification.
   - The rendering pipeline should accept plugin-like extensions for new shader effects or blending modes.

2. **Documentation and Examples:**
   - Provide inline comments, a README, and short tutorial videos or GIFs for end-users.
   - Maintain a version-controlled configuration so users can save/load specific emitter setups.

3. **Testing and Debugging Tools:**
   - Integrate debug views (highlight emitter shapes, show collision boundaries).
   - Performance meters to track simulation FPS and memory usage.
   - Logging framework for SceneScript bindings and audio responsiveness behavior.

---

### Conclusion

By following the above step-by-step planning prompt, the development process will yield a robust, modular, and user-friendly Advanced Fluid Simulation system. It will incorporate all the requested functionalities—multiple emitters, rich rendering modes, perspective and collision features, audio responsiveness, and a well-structured UI—while maintaining a clean codebase that can be easily extended or adapted in the future.