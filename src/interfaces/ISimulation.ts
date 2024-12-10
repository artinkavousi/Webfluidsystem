export interface ISimulation {
    // Simulation parameters
    setViscosity(value: number): void;
    setDissipation(value: number): void;
    setSaturation(value: number): void;
    setGravity(x: number, y: number): void;
    
    // Rendering modes
    setRenderMode(mode: 'gradient' | 'emitterColor' | 'backgroundColor' | 'distortion'): void;
    setGradient(colors: [number, number, number][]): void;
    setDistortionStrength(value: number): void;
    
    // Simulation state
    step(deltaTime: number): void;
    reset(): void;
    
    // Resource management
    initialize(): void;
    dispose(): void;
    
    // Debug/Stats
    getPerformanceStats(): {
        fps: number;
        particleCount: number;
        memoryUsage: number;
    };
}
