import { IScene } from '../interfaces/IScene';
import { IEmitter } from '../interfaces/IEmitter';
import { SimulationManager } from './SimulationManager';

export class SceneManager implements IScene {
    private _emitters: Set<IEmitter>;
    private _simulationManager: SimulationManager;
    private _backgroundColor: [number, number, number];
    private _blendMode: string;
    private _opacity: number;
    private _perspectiveMatrix: number[];
    private _collisionMask: ImageData | null;
    private _initialized: boolean;

    constructor(simulationManager: SimulationManager) {
        this._emitters = new Set();
        this._simulationManager = simulationManager;
        this._backgroundColor = [0, 0, 0];
        this._blendMode = 'normal';
        this._opacity = 1.0;
        this._perspectiveMatrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        this._collisionMask = null;
        this._initialized = false;
    }

    // IScene implementation
    addEmitter(emitter: IEmitter): void {
        if (!this._initialized) {
            console.warn('Scene not initialized');
            return;
        }
        this._emitters.add(emitter);
        emitter.initialize();
    }

    removeEmitter(emitter: IEmitter): void {
        if (this._emitters.has(emitter)) {
            emitter.dispose();
            this._emitters.delete(emitter);
        }
    }

    getEmitters(): IEmitter[] {
        return Array.from(this._emitters);
    }

    setGravity(x: number, y: number): void {
        this._simulationManager.setGravity(x, y);
    }

    setPerspective(matrix: number[]): void {
        if (matrix.length !== 16) {
            throw new Error('Perspective matrix must be 4x4 (16 elements)');
        }
        this._perspectiveMatrix = matrix;
    }

    setCollisionMask(mask: ImageData): void {
        this._collisionMask = mask;
    }

    update(deltaTime: number): void {
        if (!this._initialized) return;

        // Update simulation
        this._simulationManager.step(deltaTime);

        // Update all emitters
        for (const emitter of this._emitters) {
            emitter.update(deltaTime);
        }
    }

    render(): void {
        if (!this._initialized) return;

        // Render all emitters
        for (const emitter of this._emitters) {
            emitter.render();
        }
    }

    setBackgroundColor(color: [number, number, number]): void {
        this._backgroundColor = color;
    }

    setBlendMode(mode: string): void {
        this._blendMode = mode;
    }

    setOpacity(opacity: number): void {
        this._opacity = Math.max(0, Math.min(1, opacity));
    }

    initialize(): void {
        if (this._initialized) return;
        
        // Initialize simulation manager
        this._simulationManager.initialize();
        
        // Implementation will initialize WebGL context and resources
        // This is a placeholder for the actual initialization logic
        
        this._initialized = true;
    }

    dispose(): void {
        if (!this._initialized) return;

        // Dispose all emitters
        for (const emitter of this._emitters) {
            emitter.dispose();
        }
        this._emitters.clear();

        // Dispose simulation manager
        this._simulationManager.dispose();

        // Implementation will clean up WebGL resources
        // This is a placeholder for the actual cleanup logic

        this._initialized = false;
    }
}
