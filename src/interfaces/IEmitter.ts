import { Vector2 } from '../types';

export interface IEmitter {
    position: Vector2;
    size: number;
    emissionRate: number;
    direction: Vector2;
    color: [number, number, number];
    
    // Core methods
    update(deltaTime: number): void;
    render(): void;
    
    // Optional audio response
    setAudioResponse?(frequency: number, amplitude: number): void;
    
    // Common properties
    setPosition(position: Vector2): void;
    setDirection(direction: Vector2): void;
    setColor(color: [number, number, number]): void;
    setSize(size: number): void;
    setEmissionRate(rate: number): void;
    
    // Lifecycle
    initialize(): void;
    dispose(): void;
}
