import { ISimulation } from '../interfaces/ISimulation';
import { RenderUtils } from '../utils/RenderUtils';
import { vertexShader, advectionShader } from '../shaders/fluidShaders';

export class SimulationManager implements ISimulation {
    private _canvas: HTMLCanvasElement;
    private _gl: WebGLRenderingContext | null;
    private _width: number;
    private _height: number;
    private _viscosity: number;
    private _dissipation: number;
    private _saturation: number;
    private _gravity: { x: number; y: number };
    private _renderMode: 'gradient' | 'emitterColor' | 'backgroundColor' | 'distortion';
    private _gradient: [number, number, number][];
    private _distortionStrength: number;
    private _vertexBuffer: WebGLBuffer | null;
    private _baseProgram: WebGLProgram | null;
    private _initialized: boolean;

    constructor() {
        this._canvas = document.createElement('canvas');
        this._gl = this._canvas.getContext('webgl', {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false
        });

        if (!this._gl) {
            throw new Error('WebGL not supported');
        }

        this._width = 0;
        this._height = 0;
        this._viscosity = 1.0;
        this._dissipation = 0.98;
        this._saturation = 1.0;
        this._gravity = { x: 0, y: 0 };
        this._renderMode = 'emitterColor';
        this._gradient = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        this._distortionStrength = 1.0;
        this._vertexBuffer = null;
        this._baseProgram = null;
        this._initialized = false;

        // Add canvas to document
        this._canvas.style.position = 'fixed';
        this._canvas.style.top = '0';
        this._canvas.style.left = '0';
        this._canvas.style.width = '100%';
        this._canvas.style.height = '100%';
        document.body.appendChild(this._canvas);
    }

    resize(width: number, height: number): void {
        const dpr = window.devicePixelRatio || 1;
        this._width = width * dpr;
        this._height = height * dpr;
        this._canvas.width = this._width;
        this._canvas.height = this._height;
        
        if (this._gl) {
            this._gl.viewport(0, 0, this._width, this._height);
        }
    }

    // ISimulation implementation
    setViscosity(value: number): void {
        this._viscosity = value;
    }

    setDissipation(value: number): void {
        this._dissipation = value;
    }

    setSaturation(value: number): void {
        this._saturation = value;
    }

    setGravity(x: number, y: number): void {
        this._gravity = { x, y };
    }

    setRenderMode(mode: 'gradient' | 'emitterColor' | 'backgroundColor' | 'distortion'): void {
        this._renderMode = mode;
    }

    setGradient(colors: [number, number, number][]): void {
        this._gradient = colors;
        if (this._gl && this._initialized) {
            // Update gradient texture
            RenderUtils.createGradientTexture(this._gl, colors);
        }
    }

    setDistortionStrength(value: number): void {
        this._distortionStrength = value;
    }

    step(deltaTime: number): void {
        if (!this._initialized || !this._gl || !this._baseProgram || !this._vertexBuffer) return;
        
        const gl = this._gl;

        // Clear the canvas
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Set viewport
        gl.viewport(0, 0, this._width, this._height);

        // Use base program
        gl.useProgram(this._baseProgram);

        // Set up vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        const positionLocation = gl.getAttribLocation(this._baseProgram, 'aPosition');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    reset(): void {
        if (!this._initialized || !this._gl) return;
        
        // Clear all buffers and reset state
        this._gl.clearColor(0, 0, 0, 1);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    }

    initialize(): void {
        if (this._initialized || !this._gl) return;

        // Set initial canvas size
        this.resize(window.innerWidth, window.innerHeight);

        // Initialize WebGL context and resources
        const gl = this._gl;
        
        // Enable required extensions
        const requiredExtensions = [
            'OES_texture_float',
            'OES_texture_float_linear',
            'OES_texture_half_float',
            'OES_texture_half_float_linear'
        ];

        for (const ext of requiredExtensions) {
            if (!gl.getExtension(ext)) {
                throw new Error(`Required WebGL extension ${ext} not supported`);
            }
        }

        // Set initial WebGL state
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 1);
        gl.viewport(0, 0, this._width, this._height);

        // Create vertex buffer for a fullscreen quad
        const vertices = new Float32Array([
            -1, -1,  // bottom left
             1, -1,  // bottom right
            -1,  1,  // top left
             1,  1   // top right
        ]);
        this._vertexBuffer = RenderUtils.createBuffer(gl, vertices);

        // Create base program for rendering
        const vertShader = RenderUtils.createShader(gl, gl.VERTEX_SHADER, vertexShader);
        const fragShader = RenderUtils.createShader(gl, gl.FRAGMENT_SHADER, advectionShader);

        if (!vertShader || !fragShader) {
            throw new Error('Failed to create shaders');
        }

        this._baseProgram = RenderUtils.createProgram(gl, vertShader, fragShader);

        if (!this._baseProgram) {
            throw new Error('Failed to create shader program');
        }

        // Clean up shaders
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
        
        this._initialized = true;
    }

    dispose(): void {
        if (!this._initialized) return;
        
        // Cleanup WebGL resources
        if (this._gl) {
            // Delete buffers
            if (this._vertexBuffer) {
                this._gl.deleteBuffer(this._vertexBuffer);
                this._vertexBuffer = null;
            }

            // Delete programs
            if (this._baseProgram) {
                this._gl.deleteProgram(this._baseProgram);
                this._baseProgram = null;
            }

            // Lose WebGL context
            const loseContext = this._gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }
        }

        // Remove canvas from document
        if (this._canvas.parentElement) {
            this._canvas.parentElement.removeChild(this._canvas);
        }

        this._initialized = false;
    }

    getPerformanceStats(): { fps: number; particleCount: number; memoryUsage: number; } {
        return {
            fps: 60, // Placeholder
            particleCount: 0, // Placeholder
            memoryUsage: 0 // Placeholder
        };
    }

    // Getters for internal state
    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    get gl(): WebGLRenderingContext | null {
        return this._gl;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get isInitialized(): boolean {
        return this._initialized;
    }
}
