import { BaseEmitter } from './BaseEmitter';
import { Vector2 } from '../types';

export class DyeEmitter extends BaseEmitter {
    private _radius: number;
    private _fadeRate: number;
    private _intensity: number;
    private _audioResponse: boolean;
    private _frequency: number;
    private _amplitude: number;

    constructor(
        position: Vector2,
        radius: number = 5.0,
        color: [number, number, number] = [1, 1, 1],
        intensity: number = 1.0,
        fadeRate: number = 0.01
    ) {
        super(position, radius * 2, 1.0, { x: 0, y: 0 }, color);
        
        this._radius = radius;
        this._fadeRate = fadeRate;
        this._intensity = intensity;
        this._audioResponse = false;
        this._frequency = 0;
        this._amplitude = 0;
    }

    update(deltaTime: number): void {
        if (!this._active) return;

        // Calculate current intensity based on audio response
        let currentIntensity = this._intensity;
        if (this._audioResponse) {
            currentIntensity *= (1 + this._amplitude * Math.sin(this._frequency * deltaTime));
        }

        // Implementation will integrate with the fluid simulation system
        // This is a placeholder for the actual dye emission logic
        // Unlike other emitters, dye emitter creates a static color field
        // that gradually fades over time
    }

    render(): void {
        if (!this._active) return;
        // Implementation will integrate with the WebGL rendering system
        // This is a placeholder for the actual rendering logic
    }

    setAudioResponse(frequency: number, amplitude: number): void {
        this._audioResponse = true;
        this._frequency = frequency;
        this._amplitude = amplitude;
    }

    setRadius(radius: number): void {
        this._radius = radius;
        this._size = radius * 2; // Update base class size
    }

    setFadeRate(rate: number): void {
        this._fadeRate = rate;
    }

    setIntensity(intensity: number): void {
        this._intensity = intensity;
    }

    // Override base class methods to prevent unwanted behavior
    setEmissionRate(rate: number): void {
        // Dye emitter doesn't use emission rate
        console.warn('Emission rate has no effect on DyeEmitter');
    }

    setDirection(direction: Vector2): void {
        // Dye emitter doesn't use direction
        console.warn('Direction has no effect on DyeEmitter');
    }
}
