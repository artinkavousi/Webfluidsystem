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

    constructor(simulation: Simulation) {
        this._simulation = simulation;
        this._audioManager = new AudioManager();
        this._lastUpdate = Date.now();
        
        // Start audio immediately
        this._audioManager.enableAudio().catch(error => {
            console.warn('Failed to enable audio in EmitterManager:', error);
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
        const audioData = this._audioManager.getAudioData();
        if (!audioData) {
            console.log('No audio data available');
            return;
        }

        let force = emitter.force;
        let radius = emitter.radius || 1;

        // Apply audio effects to force if enabled
        if (this._audioConfig.affectsForce) {
            const forceRange = this._audioConfig.maxForce - this._audioConfig.minForce;
            const normalizedAmplitude = Math.min(Math.max(audioData.amplitude, 0), 1);
            
            // Add some exponential scaling for more dramatic effect
            const scaledAmplitude = Math.pow(normalizedAmplitude * this._audioConfig.intensity, 1.5);
            force = this._audioConfig.minForce + (forceRange * scaledAmplitude);
            
            console.log('Audio force effect:', {
                baseForce: emitter.force,
                audioAmplitude: audioData.amplitude,
                scaledAmplitude,
                calculatedForce: force,
                min: this._audioConfig.minForce,
                max: this._audioConfig.maxForce
            });
        }

        // Apply audio effects to radius if enabled
        if (this._audioConfig.affectsRadius) {
            const radiusRange = this._audioConfig.maxRadius - this._audioConfig.minRadius;
            const normalizedAmplitude = Math.min(Math.max(audioData.amplitude, 0), 1);
            
            // Add some exponential scaling for more dramatic effect
            const scaledAmplitude = Math.pow(normalizedAmplitude * this._audioConfig.intensity, 1.5);
            radius = this._audioConfig.minRadius + (radiusRange * scaledAmplitude);
            
            console.log('Audio radius effect:', {
                baseRadius: emitter.radius,
                audioAmplitude: audioData.amplitude,
                scaledAmplitude,
                calculatedRadius: radius,
                min: this._audioConfig.minRadius,
                max: this._audioConfig.maxRadius
            });
        }

        // Apply the effect with calculated values
        if (emitter.active) {
            this._simulation.applyForce(
                emitter.position[0],
                emitter.position[1],
                emitter.direction[0] * force,
                emitter.direction[1] * force,
                radius
            );
        }
    }

    public setAudioConfig(config: any): void {
        this._audioConfig = {
            ...this._audioConfig,
            ...config
        };
        console.log('Updated audio config:', this._audioConfig);
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
            console.error('Failed to enable audio reactivity:', error);
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
                const { position, direction, force, color, size } = emitter;
                // Scale force by size but keep it very gentle
                const scaledForce = force * size * 0.05; 
                const dx = direction[0] * scaledForce;
                const dy = direction[1] * scaledForce;
                // Convert array color to object format with minimal intensity
                const colorObj = {
                    r: color[0] * 0.1, 
                    g: color[1] * 0.1,
                    b: color[2] * 0.1
                };
                splatCallback(position[0], position[1], dx, dy, colorObj);
            }
        });
    }
}
