import { AudioManager } from './audio/AudioManager';

export class EmitterManager {
    private _simulation: Simulation;
    private _audioManager: AudioManager;
    private _emitters: any[] = [];
    private _audioConfig: any = {
        affectsForce: true,
        affectsRadius: true,
        minForce: 0,
        maxForce: 500,
        minRadius: 0.01,
        maxRadius: 1.0,
        intensity: 2.0
    };
    private _lastUpdate: number = 0;
    private _updateInterval: number = 1000 / 60; // 60fps
    private _audioContext: AudioContext | null = null;
    private _audioAnalyser: AnalyserNode | null = null;
    private _audioData: Uint8Array | null = null;
    private _fallbackMode: boolean = false;
    private _fallbackData: number[] = [];

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
        let finalForce = emitter.force || 1000;
        let finalRadius = emitter.radius || 1;

        // Apply audio effects if available
        if (audioData) {
            if (this._audioConfig.affectsForce) {
                const forceRange = this._audioConfig.maxForce - this._audioConfig.minForce;
                const normalizedAmplitude = Math.min(Math.max(audioData.amplitude, 0), 1);
                finalForce += forceRange * normalizedAmplitude;
            }

            if (this._audioConfig.affectsRadius) {
                const radiusRange = this._audioConfig.maxRadius - this._audioConfig.minRadius;
                const normalizedAmplitude = Math.min(Math.max(audioData.amplitude, 0), 1);
                finalRadius += radiusRange * normalizedAmplitude;
            }
        }

        // Apply the effect
        if (emitter.active) {
            const dx = emitter.direction[0] * finalForce;
            const dy = emitter.direction[1] * finalForce;
            
            this._simulation.splat(
                emitter.position[0],
                emitter.position[1],
                dx,
                dy,
                { r: 0.5, g: 0.5, b: 1.0 }
            );
        }
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
                const force = emitter.force || 1000;
                const color = emitter.color || [30, 0, 300];

                // Scale force but keep it gentle
                const dx = direction[0] * force;
                const dy = direction[1] * force;
                
                // Convert array color to object format
                const colorObj = {
                    r: Math.min(255, Math.max(0, color[0])) / 255,
                    g: Math.min(255, Math.max(0, color[1])) / 255,
                    b: Math.min(255, Math.max(0, color[2])) / 255
                };

                splatCallback(position[0], position[1], dx, dy, colorObj);
            }
        });
    }

    public addMouseEmitter(x: number, y: number, force: number = 1000, radius: number = 1): number {
        const emitterConfig = {
            active: true,
            position: [x, y],
            direction: [0, 0],
            force: force * 0.1,
            radius: radius,
            type: 'mouse',
            color: [30, 0, 300]
        };
        return this.addEmitter(emitterConfig);
    }

    public updateMouseEmitter(index: number, x: number, y: number, dx: number, dy: number): void {
        const emitter = this._emitters[index];
        if (emitter && emitter.type === 'mouse') {
            const length = Math.sqrt(dx * dx + dy * dy);
            const scale = 0.1;
            emitter.position = [x, y];
            if (length > 0) {
                emitter.direction = [dx / length * scale, dy / length * scale];
            } else {
                emitter.direction = [0, 0];
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
