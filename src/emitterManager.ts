import { AudioManager } from './audio/AudioManager';

export class EmitterManager {
    private _simulation: Simulation;
    private _audioManager: AudioManager;
    private _emitters: any[] = [];
    private _audioConfig: any = {
        affectsForce: true,
        affectsRadius: true,
        minForce: 4000,
        maxForce: 18000,
        minRadius: 0.04,
        maxRadius: 0.25,
        intensity: 2.2,
        smoothing: 0.55,
        velocityScale: 0.3
    };
    private _lastUpdate: number = 0;
    private _updateInterval: number = 1000 / 60; // 60fps
    private _audioContext: AudioContext | null = null;
    private _audioAnalyser: AnalyserNode | null = null;
    private _audioData: Uint8Array | null = null;
    private _fallbackMode: boolean = false;
    private _fallbackData: number[] = [];
    private _lastAudioAmplitude: number = 0;

    constructor(simulation: Simulation) {
        this._simulation = simulation;
        this._audioManager = new AudioManager();
        this._lastUpdate = Date.now();
        
        // Start audio immediately
        this._audioManager.enableAudio().catch(() => {
            // Silently handle error
        });

        // Start update loop
        this.update();
    }

    private update = () => {
        const now = Date.now();
        const deltaTime = now - this._lastUpdate;

        if (deltaTime >= this._updateInterval) {
            this._emitters.forEach((emitter, index) => {
                if (emitter.active) {
                    this.processEmitterEffect(emitter);
                }
            });
            this._lastUpdate = now;
        }

        requestAnimationFrame(this.update);
    }

    private processEmitterEffect(emitter: any): void {
        // Get audio data if available
        const audioData = this._audioManager.getAudioData();
        let finalForce = emitter.force || 8000;
        let finalRadius = emitter.radius || 0.08;

        // Apply audio effects if available
        if (audioData) {
            const currentAmplitude = Math.min(Math.max(audioData.amplitude, 0), 1);
            const smoothedAmplitude = this._lastAudioAmplitude * this._audioConfig.smoothing + 
                                    currentAmplitude * (1 - this._audioConfig.smoothing);
            this._lastAudioAmplitude = smoothedAmplitude;

            if (this._audioConfig.affectsForce) {
                // More dynamic force scaling with steeper power curve
                const forceRange = this._audioConfig.maxForce - this._audioConfig.minForce;
                finalForce = this._audioConfig.minForce + 
                    (forceRange * Math.pow(smoothedAmplitude, 1.2) * this._audioConfig.intensity);
            }

            if (this._audioConfig.affectsRadius) {
                // More sensitive radius scaling
                const radiusRange = this._audioConfig.maxRadius - this._audioConfig.minRadius;
                finalRadius = this._audioConfig.minRadius + 
                    (radiusRange * Math.pow(smoothedAmplitude, 0.6));
            }
        }

        // Apply the effect with enhanced dynamics
        if (emitter.active) {
            const dx = emitter.direction[0] * finalForce;
            const dy = emitter.direction[1] * finalForce;
            
            // Enhanced velocity-based color with more sensitivity
            const velocity = Math.sqrt(dx * dx + dy * dy);
            const normalizedVelocity = Math.min(velocity / (this._audioConfig.maxForce * 0.7), 1);
            const color = this.getDynamicColor(normalizedVelocity, emitter.baseColor);
            
            this._simulation.splat(
                emitter.position[0],
                emitter.position[1],
                dx,
                dy,
                color
            );
        }
    }

    private getDynamicColor(intensity: number, baseColor?: number[]): { r: number, g: number, b: number } {
        if (baseColor) {
            // Enhanced color intensity scaling
            const powerCurve = Math.pow(intensity, 0.7); // Softer power curve for more color variation
            return {
                r: 0.3 + powerCurve * 0.7,
                g: 0.1 + powerCurve * 0.6,
                b: 0.7 + powerCurve * 0.3
            };
        }

        // Enhanced default dynamic color
        return {
            r: 0.2 + intensity * 0.8,
            g: 0.1 + intensity * 0.6,
            b: 0.6 + intensity * 0.4
        };
    }

    private getEmitterColor(intensity: number, baseColor: number[]): { r: number, g: number, b: number } {
        // Ensure base color values are within valid range
        const r = Math.min(255, Math.max(0, baseColor[0]));
        const g = Math.min(255, Math.max(0, baseColor[1]));
        const b = Math.min(255, Math.max(0, baseColor[2]));

        // Apply intensity with better color preservation
        return {
            r: (r / 255) * (0.3 + intensity * 0.7),
            g: (g / 255) * (0.3 + intensity * 0.7),
            b: (b / 255) * (0.3 + intensity * 0.7)
        };
    }

    public setAudioConfig(config: any): void {
        this._audioConfig = {
            ...this._audioConfig,
            ...config
        };
    }

    public addEmitter(emitterConfig: any) {
        this._emitters.push(emitterConfig);
        return this._emitters.length - 1;
    }

    public removeEmitter(index: number) {
        if (index >= 0 && index < this._emitters.length) {
            this._emitters.splice(index, 1);
        }
    }

    public getEmitter(index: number) {
        return this._emitters[index];
    }

    public updateEmitter(index: number, config: any) {
        if (index >= 0 && index < this._emitters.length) {
            this._emitters[index] = { ...this._emitters[index], ...config };
        }
    }

    public get emitters() {
        return this._emitters;
    }

    public async enableAudioReactivity(): Promise<void> {
        try {
            await this._audioManager.enableAudio();
        } catch (error) {
            // Silently handle error
        }
    }

    public hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    public processEmitters(splatCallback: (x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }) => void) {
        this._emitters.forEach(emitter => {
            if (emitter.active) {
                const position = emitter.position || [0, 0];
                const direction = emitter.direction || [0, 0];
                const force = emitter.force || 6000;
                
                const dx = direction[0] * force;
                const dy = direction[1] * force;
                
                // Dynamic color based on velocity
                const velocity = Math.sqrt(dx * dx + dy * dy);
                const normalizedVelocity = Math.min(velocity / 8000, 1);
                const colorObj = this.getDynamicColor(normalizedVelocity, emitter.baseColor);

                splatCallback(position[0], position[1], dx, dy, colorObj);
            }
        });
    }

    public addMouseEmitter(x: number, y: number, force: number = 8000, radius: number = 0.08): number {
        const emitterConfig = {
            active: true,
            position: [x, y],
            direction: [0, 0],
            force: force,
            radius: radius,
            type: 'mouse',
            baseColor: [0.3, 0.1, 0.7],
            velocityFactor: this._audioConfig.velocityScale,
            minForce: force * 0.35,
            maxForce: force * 0.95,
            radiusRange: [0.04, 0.25],
            forceCurve: 1.2,
            radiusCurve: 0.6
        };
        return this.addEmitter(emitterConfig);
    }

    public updateMouseEmitter(index: number, x: number, y: number, dx: number, dy: number): void {
        const emitter = this._emitters[index];
        if (emitter && emitter.type === 'mouse') {
            const length = Math.sqrt(dx * dx + dy * dy);
            const velocityFactor = emitter.velocityFactor || this._audioConfig.velocityScale;
            
            // Enhanced velocity-based force calculation
            const normalizedLength = Math.min(length / 25, 1);
            const forceCurve = Math.pow(normalizedLength, emitter.forceCurve || 1.2);
            const dynamicForce = emitter.minForce + 
                (emitter.maxForce - emitter.minForce) * forceCurve;
            
            // Enhanced radius calculation with smaller range
            const radiusRange = emitter.radiusRange || [0.04, 0.25];
            const radiusCurve = Math.pow(normalizedLength, emitter.radiusCurve || 0.6);
            const dynamicRadius = radiusRange[0] + 
                (radiusRange[1] - radiusRange[0]) * radiusCurve;
            
            emitter.position = [x, y];
            if (length > 0) {
                // Enhanced direction calculation with more immediate response
                const dirX = dx / length * velocityFactor;
                const dirY = dy / length * velocityFactor;
                
                // More immediate direction changes
                emitter.direction = [
                    dirX * 0.95 + (emitter.direction[0] || 0) * 0.05,
                    dirY * 0.95 + (emitter.direction[1] || 0) * 0.05
                ];
                emitter.force = dynamicForce;
                emitter.radius = dynamicRadius;
            } else {
                emitter.direction = [0, 0];
                emitter.force = emitter.minForce;
                emitter.radius = radiusRange[0];
            }
            emitter.active = true;
        }
    }

    public deactivateMouseEmitter(index: number): void {
        const emitter = this._emitters[index];
        if (emitter && emitter.type === 'mouse') {
            emitter.active = false;
        }
    }

    public setFallbackAudioMode(enabled: boolean): void {
        this._fallbackMode = enabled;
        if (enabled) {
            // Initialize fallback audio simulation
            this.initializeFallbackAudio();
        }
    }

    private initializeFallbackAudio(): void {
        // Create simulated frequency data
        const frequencyCount = 32;
        this._fallbackData = new Array(frequencyCount).fill(0);
        this._lastUpdate = Date.now();
    }

    private updateFallbackAudio(): void {
        const now = Date.now();
        if (now - this._lastUpdate < this._updateInterval) return;

        // Generate smooth, oscillating values for different frequency ranges
        const time = now / 1000;
        for (let i = 0; i < this._fallbackData.length; i++) {
            // Create different frequencies for different ranges
            const baseFreq = i / this._fallbackData.length;
            const value = 
                Math.sin(time * (1 + baseFreq) * 2) * 0.3 + // Base oscillation
                Math.sin(time * (2 + baseFreq) * 3) * 0.2 + // Higher frequency
                Math.sin(time * (0.5 + baseFreq)) * 0.2;    // Lower frequency
            
            // Normalize to 0-255 range (similar to real audio data)
            this._fallbackData[i] = Math.floor(((value + 1) / 2) * 255);
        }

        this._lastUpdate = now;
    }

    public getAudioData(): Uint8Array | number[] | null {
        if (this._fallbackMode) {
            this.updateFallbackAudio();
            return this._fallbackData;
        }

        if (this._audioAnalyser && this._audioData) {
            this._audioAnalyser.getByteFrequencyData(this._audioData);
            return this._audioData;
        }

        return null;
    }
}
