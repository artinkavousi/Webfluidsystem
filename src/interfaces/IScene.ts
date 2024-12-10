import { IEmitter } from './IEmitter';

export interface IScene {
    // Emitter management
    addEmitter(emitter: IEmitter): void;
    removeEmitter(emitter: IEmitter): void;
    getEmitters(): IEmitter[];
    
    // Scene properties
    setGravity(x: number, y: number): void;
    setPerspective(matrix: number[]): void;
    setCollisionMask(mask: ImageData): void;
    
    // Scene state
    update(deltaTime: number): void;
    render(): void;
    
    // Scene configuration
    setBackgroundColor(color: [number, number, number]): void;
    setBlendMode(mode: string): void;
    setOpacity(opacity: number): void;
    
    // Resource management
    initialize(): void;
    dispose(): void;
}
