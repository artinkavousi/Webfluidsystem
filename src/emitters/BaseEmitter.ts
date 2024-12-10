import { IEmitter } from '../interfaces/IEmitter';
import { Vector2 } from '../types';

export abstract class BaseEmitter implements IEmitter {
    protected _position: Vector2;
    protected _size: number;
    protected _emissionRate: number;
    protected _direction: Vector2;
    protected _color: [number, number, number];
    protected _active: boolean;

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
    }

    // IEmitter implementation
    abstract update(deltaTime: number): void;
    abstract render(): void;

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
