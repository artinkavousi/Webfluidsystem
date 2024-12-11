export class AudioManager {
    private _audioContext: AudioContext | null = null;
    private _analyser: AnalyserNode | null = null;
    private _mediaStream: MediaStream | null = null;
    private _isEnabled: boolean = false;
    private _frequencyRange: 'low' | 'mid' | 'high' = 'mid';
    private _intensity: number = 1.0;
    private _dataArray: Uint8Array = new Uint8Array();
    private _smoothedAmplitude: number = 0;

    constructor() {}

    async enableAudio(): Promise<void> {
        if (this._isEnabled) {
            return;
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser does not support getUserMedia');
            }

            this._mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this._analyser = this._audioContext.createAnalyser();
            
            this._analyser.fftSize = 1024;
            this._analyser.smoothingTimeConstant = 0.85;
            this._analyser.minDecibels = -85;
            this._analyser.maxDecibels = -25;

            const source = this._audioContext.createMediaStreamSource(this._mediaStream);
            source.connect(this._analyser);

            const bufferLength = this._analyser.frequencyBinCount;
            this._dataArray = new Uint8Array(bufferLength);

            this._isEnabled = true;
            
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume();
            }
        } catch (error) {
            this._isEnabled = false;
            this.disable();
            throw error;
        }
    }

    async initialize(): Promise<void> {
        this._isEnabled = false;
    }

    public async initializeMicrophone(): Promise<void> {
        try {
            this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = this._audioContext.createMediaStreamSource(this._mediaStream);
            
            this._analyser = this._audioContext.createAnalyser();
            this._analyser.fftSize = 2048;
            this._analyser.smoothingTimeConstant = 0.85;
            
            source.connect(this._analyser);
            this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
            
            this._isEnabled = true;
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    public disable(): void {
        if (this._mediaStream) {
            this._mediaStream.getTracks().forEach(track => track.stop());
            this._mediaStream = null;
        }
        if (this._audioContext) {
            this._audioContext.close();
            this._audioContext = null;
        }
        this._analyser = null;
        this._isEnabled = false;
    }

    public getAudioData(): { amplitude: number; frequencies: number[] } | undefined {
        if (!this._isEnabled || !this._analyser || !this._audioContext) {
            return undefined;
        }

        try {
            if (this._audioContext.state === 'suspended') {
                this._audioContext.resume();
            }

            const frequencyData = new Uint8Array(this._analyser.frequencyBinCount);
            this._analyser.getByteFrequencyData(frequencyData);

            const rangeStart = this.getFrequencyRangeStart();
            const rangeEnd = this.getFrequencyRangeEnd();
            
            let freqSum = 0;
            const rangeData = frequencyData.slice(rangeStart, rangeEnd);
            for (let i = 0; i < rangeData.length; i++) {
                freqSum += rangeData[i];
            }
            const avgFreqAmplitude = freqSum / rangeData.length / 255;

            const timeDomainData = new Uint8Array(this._analyser.frequencyBinCount);
            this._analyser.getByteTimeDomainData(timeDomainData);

            let sum = 0;
            for (let i = 0; i < timeDomainData.length; i++) {
                const amplitude = (timeDomainData[i] - 128) / 128;
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / timeDomainData.length);

            const combinedAmplitude = Math.max(rms, avgFreqAmplitude) * this._intensity;

            this._smoothedAmplitude = this._smoothedAmplitude * 0.8 + combinedAmplitude * 0.2;

            const frequencies = Array.from(rangeData)
                .map(value => (value / 255) * this._intensity);

            return {
                amplitude: this._smoothedAmplitude,
                frequencies
            };
        } catch (error) {
            return undefined;
        }
    }

    private getFrequencyRangeStart(): number {
        const binCount = this._analyser!.frequencyBinCount;
        switch (this._frequencyRange) {
            case 'low': return 0;
            case 'mid': return Math.floor(binCount * 0.1);
            case 'high': return Math.floor(binCount * 0.5);
            default: return 0;
        }
    }

    private getFrequencyRangeEnd(): number {
        const binCount = this._analyser!.frequencyBinCount;
        switch (this._frequencyRange) {
            case 'low': return Math.floor(binCount * 0.1);
            case 'mid': return Math.floor(binCount * 0.5);
            case 'high': return binCount;
            default: return binCount;
        }
    }

    setFrequencyRange(range: 'low' | 'mid' | 'high'): void {
        this._frequencyRange = range;
    }

    setIntensity(intensity: number): void {
        this._intensity = Math.max(0, Math.min(2, intensity));
    }

    isEnabled(): boolean {
        return this._isEnabled;
    }

    dispose(): void {
        if (this._mediaStream) {
            this._mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this._audioContext) {
            this._audioContext.close();
        }
        this._isEnabled = false;
    }

    private debugAudioInput(): void {
        if (!this._isEnabled || !this._analyser) return;

        const processAudio = () => {
            if (!this._isEnabled || !this._analyser) return;

            this._analyser.getByteFrequencyData(this._dataArray);
            const average = Array.from(this._dataArray).reduce((a, b) => a + b, 0) / this._dataArray.length;
            
            this._smoothedAmplitude = this._smoothedAmplitude * 0.95 + (average / 255) * 0.05;
            
            requestAnimationFrame(processAudio);
        };

        processAudio();
    }
}
