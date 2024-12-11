import { Vector2 } from '../types';

export interface IEmitter {
    type: string;
    active: boolean;
    position: { x: number; y: number };
    size: number;
    emissionRate: number;
    direction: { x: number; y: number };
    color: string;
    force: number;
    radius: number;
    audioReactive: boolean;
    audioConfig: {
        frequencyRange: 'low' | 'mid' | 'high';
        intensityMultiplier: number;
        affectsForce: boolean;
        affectsRadius: boolean;
        minForce: number;
        maxForce: number;
        minRadius: number;
        maxRadius: number;
    };
    
    // Core methods
    update(deltaTime: number, audioData?: { frequency: number; amplitude: number }): void;
    render(): void;
    
    // Optional audio response
    setAudioResponse?(frequency: number, amplitude: number): void;
    
    // Common properties
    setPosition(position: { x: number; y: number }): void;
    setDirection(direction: { x: number; y: number }): void;
    setColor(color: string): void;
    setSize(size: number): void;
    setEmissionRate(rate: number): void;
    
    // Lifecycle
    initialize(): void;
    dispose(): void;
}
