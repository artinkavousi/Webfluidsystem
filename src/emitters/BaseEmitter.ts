import { IEmitter } from '../interfaces/IEmitter';
import { Vector2 } from '../types';

export abstract class BaseEmitter implements IEmitter {
    protected _position: Vector2;
    protected _size: number;
    protected _emissionRate: number;
    protected _direction: Vector2;
    protected _color: [number, number, number];
    protected _active: boolean;
    protected _audioReactive: boolean;
    protected _audioConfig: {
        frequencyRange: 'low' | 'mid' | 'high';
        intensityMultiplier: number;
        affectsForce: boolean;
        affectsRadius: boolean;
        minForce: number;
        maxForce: number;
        minRadius: number;
        maxRadius: number;
    };

    constructor(
        position: Vector2,
        size: number = 1.0,
        emissionRate: number = 1.0,
        direction: Vector2 = { x: 0, y: 1 },
        color: [number, number, number] = [1, 1, 1]
    ) {
        this._position = position;
        this._size = size;
        this._emissionRate = emissionRate;
        this._direction = direction;
        this._color = color;
        this._active = false;
        this._audioReactive = false;
        this._audioConfig = {
            frequencyRange: 'mid',
            intensityMultiplier: 1.0,
            affectsForce: true,
            affectsRadius: false,
            minForce: 10,
            maxForce: 200,
            minRadius: 0.05,
            maxRadius: 0.2
        };
    }

    // IEmitter implementation
    abstract update(deltaTime: number, audioData?: { frequency: number; amplitude: number }): void;
    abstract render(): void;

    protected updateAudioReactiveProperties(audioData: { frequency: number; amplitude: number }): void {
        const { amplitude } = audioData;
        const normalizedAmplitude = amplitude * this._audioConfig.intensityMultiplier;

        if (this._audioConfig.affectsForce) {
            const forceDelta = this._audioConfig.maxForce - this._audioConfig.minForce;
            // this.force = this._audioConfig.minForce + (forceDelta * normalizedAmplitude);
        }

        if (this._audioConfig.affectsRadius) {
            const radiusDelta = this._audioConfig.maxRadius - this._audioConfig.minRadius;
            // this.radius = this._audioConfig.minRadius + (radiusDelta * normalizedAmplitude);
        }
    }

    setPosition(position: Vector2): void {
        this._position = position;
    }

    setDirection(direction: Vector2): void {
        this._direction = direction;
    }

    setColor(color: [number, number, number]): void {
        this._color = color;
    }

    setSize(size: number): void {
        this._size = size;
    }

    setEmissionRate(rate: number): void {
        this._emissionRate = rate;
    }

    setAudioConfig(config: Partial<typeof this._audioConfig>): void {
        this._audioConfig = { ...this._audioConfig, ...config };
    }

    toggleAudioReactivity(enabled: boolean): void {
        this._audioReactive = enabled;
    }

    initialize(): void {
        this._active = true;
    }

    dispose(): void {
        this._active = false;
    }

    // Getters
    get position(): Vector2 { return this._position; }
    get size(): number { return this._size; }
    get emissionRate(): number { return this._emissionRate; }
    get direction(): Vector2 { return this._direction; }
    get color(): [number, number, number] { return this._color; }
    get isActive(): boolean { return this._active; }
}
