const defaultConfig = {
  simResolution: 128,
  dyeResolution: 1024,
  captureResolution: 512,
  densityDissipation: 0.985,
  velocityDissipation: 0.99,
  pressure: 0.4,
  pressureIterations: 20,
  curl: 30,
  splatRadius: 0.08,
  splatForce: 10000,
  shading: true,
  colorful: true,
  colorUpdateSpeed: 12,
  colorPalette: [],
  hover: true,
  inverted: false,
  backgroundColor: '#000000',
  transparent: false,
  brightness: 0.95,
  bloom: true,
  bloomIterations: 8,
  bloomResolution: 256,
  bloomIntensity: 0.95,
  bloomThreshold: 0.4,
  bloomSoftKnee: 0.7,
  sunrays: true,
  sunraysResolution: 196,
  sunraysWeight: 0.95,
};

// Updated parameter ranges for more precise control
export const parameterRanges = {
  densityDissipation: { 
    min: 0.97, 
    max: 0.999, 
    step: 0.001,
    default: 0.985,
    label: "Density Dissipation",
    tooltip: "Controls how quickly dye fades away"
  },
  velocityDissipation: { 
    min: 0.97, 
    max: 0.999, 
    step: 0.001,
    default: 0.99,
    label: "Velocity Dissipation",
    tooltip: "Controls how quickly fluid motion slows down"
  },
  pressure: { 
    min: 0.2, 
    max: 0.8, 
    step: 0.05,
    default: 0.4,
    label: "Pressure",
    tooltip: "Controls how strongly fluid pushes against itself"
  },
  curl: { 
    min: 0, 
    max: 80, 
    step: 1,
    default: 30,
    label: "Curl (Vorticity)",
    tooltip: "Controls how much the fluid swirls"
  },
  splatRadius: { 
    min: 0.04, 
    max: 0.25, 
    step: 0.01,
    default: 0.08,
    label: "Splat Size",
    tooltip: "Size of fluid injection points"
  },
  splatForce: { 
    min: 4000, 
    max: 18000, 
    step: 100,
    default: 10000,
    label: "Splat Force",
    tooltip: "Strength of fluid injection"
  },
  brightness: { 
    min: 0.4, 
    max: 1.5, 
    step: 0.05,
    default: 0.95,
    label: "Brightness",
    tooltip: "Overall brightness of the simulation"
  },
  bloomIntensity: { 
    min: 0.3, 
    max: 2.0, 
    step: 0.05,
    default: 0.95,
    label: "Bloom Intensity",
    tooltip: "Strength of the glow effect"
  },
  bloomThreshold: { 
    min: 0.1, 
    max: 0.7, 
    step: 0.05,
    default: 0.4,
    label: "Bloom Threshold",
    tooltip: "Minimum brightness for bloom effect"
  }
};

// Updated fluid behavior presets
export const fluidPresets = {
  default: defaultConfig,
  water: {
    ...defaultConfig,
    densityDissipation: 0.985,
    velocityDissipation: 0.99,
    pressure: 0.4,
    curl: 30,
    splatRadius: 0.08,
    splatForce: 10000,
  },
  smoke: {
    ...defaultConfig,
    densityDissipation: 0.995,
    velocityDissipation: 0.99,
    pressure: 0.3,
    curl: 25,
    splatRadius: 0.12,
    splatForce: 8000,
  },
  ink: {
    ...defaultConfig,
    densityDissipation: 0.96,
    velocityDissipation: 0.98,
    pressure: 0.5,
    curl: 40,
    splatRadius: 0.06,
    splatForce: 12000,
  },
  fire: {
    ...defaultConfig,
    densityDissipation: 0.97,
    velocityDissipation: 0.97,
    pressure: 0.35,
    curl: 45,
    splatRadius: 0.1,
    splatForce: 15000,
  }
};

export { defaultConfig };
