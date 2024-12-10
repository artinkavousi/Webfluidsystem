import { BaseEmitter } from './BaseEmitter';
import { Vector2 } from '../types';

export class LineEmitter extends BaseEmitter {
    private _endPosition: Vector2;
    private _thickness: number;
    private _segments: number;
    private _audioResponse: boolean;
    private _frequency: number;
    private _amplitude: number;

    constructor(
        startPosition: Vector2,
        endPosition: Vector2,
        thickness: number = 1.0,
        segments: number = 10,
        emissionRate: number = 1.0,
        color: [number, number, number] = [1, 1, 1]
    ) {
        // Calculate direction from start to end
        const dx = endPosition.x - startPosition.x;
        const dy = endPosition.y - startPosition.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const direction = { x: dx / length, y: dy / length };

        super(startPosition, thickness, emissionRate, direction, color);
        
        this._endPosition = endPosition;
        this._thickness = thickness;
        this._segments = segments;
        this._audioResponse = false;
        this._frequency = 0;
        this._amplitude = 0;
    }

    update(deltaTime: number): void {
        if (!this._active) return;

        // Calculate emission points along the line
        for (let i = 0; i <= this._segments; i++) {
            const t = i / this._segments;
            const emissionPoint = {
                x: this._position.x + (this._endPosition.x - this._position.x) * t,
                y: this._position.y + (this._endPosition.y - this._position.y) * t
            };

            // Apply audio response if enabled
            let currentEmissionRate = this._emissionRate;
            if (this._audioResponse) {
                currentEmissionRate *= (1 + this._amplitude * Math.sin(this._frequency * deltaTime + t * Math.PI * 2));
            }

            // Implementation will integrate with the fluid simulation system
            // This is a placeholder for the actual fluid emission logic at each point
        }
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

    setEndPosition(position: Vector2): void {
        this._endPosition = position;
        // Recalculate direction
        const dx = this._endPosition.x - this._position.x;
        const dy = this._endPosition.y - this._position.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        this._direction = { x: dx / length, y: dy / length };
    }

    setThickness(thickness: number): void {
        this._thickness = thickness;
        this._size = thickness; // Update base class size
    }

    setSegments(segments: number): void {
        this._segments = segments;
    }
}
