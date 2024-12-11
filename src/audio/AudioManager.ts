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
            console.log('Audio already enabled');
            return;
        }

        try {
            // First check if browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser does not support getUserMedia');
            }

            console.log('Requesting microphone access...');
            this._mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('Microphone access granted');

            // Create audio context with fallback
            this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this._analyser = this._audioContext.createAnalyser();
            
            // Configure analyzer for better response
            this._analyser.fftSize = 1024; // Smaller for better performance
            this._analyser.smoothingTimeConstant = 0.85;
            this._analyser.minDecibels = -85;
            this._analyser.maxDecibels = -25;

            const source = this._audioContext.createMediaStreamSource(this._mediaStream);
            source.connect(this._analyser);

            const bufferLength = this._analyser.frequencyBinCount;
            this._dataArray = new Uint8Array(bufferLength);

            console.log('Audio system initialized:', {
                fftSize: this._analyser.fftSize,
                bufferLength,
                sampleRate: this._audioContext.sampleRate
            });

            // Start processing audio immediately
            this._isEnabled = true;
            this.debugAudioInput();
            
            // Resume audio context if it's suspended
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume();
                console.log('Audio context resumed');
            }
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this._isEnabled = false;
            this.disable(); // Clean up any partial initialization
            throw error;
        }
    }

    async initialize(): Promise<void> {
        // No automatic audio initialization
        this._isEnabled = false;
    }

    public async initializeMicrophone(): Promise<void> {
        try {
            console.log('Requesting microphone access...');
            this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted');

            this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = this._audioContext.createMediaStreamSource(this._mediaStream);
            
            this._analyser = this._audioContext.createAnalyser();
            this._analyser.fftSize = 2048;
            this._analyser.smoothingTimeConstant = 0.85;
            
            source.connect(this._analyser);
            this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
            
            console.log('Audio processing chain initialized');
            this._isEnabled = true;
        } catch (error) {
            console.error('Error initializing microphone:', error);
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
        console.log('Audio system disabled');
    }

    public getAudioData(): { amplitude: number; frequencies: number[] } | undefined {
        if (!this._isEnabled || !this._analyser || !this._audioContext) {
            return undefined;
        }

        try {
            // Resume AudioContext if it's suspended
            if (this._audioContext.state === 'suspended') {
                this._audioContext.resume();
            }

            // Get frequency data first for more accurate peak detection
            const frequencyData = new Uint8Array(this._analyser.frequencyBinCount);
            this._analyser.getByteFrequencyData(frequencyData);

            // Process frequency data based on selected range
            const rangeStart = this.getFrequencyRangeStart();
            const rangeEnd = this.getFrequencyRangeEnd();
            
            // Calculate average frequency amplitude in the selected range
            let freqSum = 0;
            const rangeData = frequencyData.slice(rangeStart, rangeEnd);
            for (let i = 0; i < rangeData.length; i++) {
                freqSum += rangeData[i];
            }
            const avgFreqAmplitude = freqSum / rangeData.length / 255; // Normalize to 0-1

            // Get time domain data for overall amplitude
            const timeDomainData = new Uint8Array(this._analyser.frequencyBinCount);
            this._analyser.getByteTimeDomainData(timeDomainData);

            // Calculate RMS amplitude from time domain data
            let sum = 0;
            for (let i = 0; i < timeDomainData.length; i++) {
                const amplitude = (timeDomainData[i] - 128) / 128;
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / timeDomainData.length);

            // Combine frequency and time domain data for more dynamic response
            const combinedAmplitude = Math.max(rms, avgFreqAmplitude) * this._intensity;

            // Apply smoothing to avoid sudden jumps
            this._smoothedAmplitude = this._smoothedAmplitude * 0.8 + combinedAmplitude * 0.2;

            // Prepare frequency data for visualization
            const frequencies = Array.from(rangeData)
                .map(value => (value / 255) * this._intensity);

            const audioData = {
                amplitude: this._smoothedAmplitude,
                frequencies
            };

            console.log('Audio data processed:', {
                rms,
                avgFreqAmplitude,
                combinedAmplitude: audioData.amplitude,
                frequencyRange: this._frequencyRange,
                intensity: this._intensity,
                frequencyMin: Math.min(...frequencies),
                frequencyMax: Math.max(...frequencies),
                frequencyAvg: frequencies.reduce((a, b) => a + b, 0) / frequencies.length
            });

            return audioData;
        } catch (error) {
            console.error('Error processing audio data:', error);
            return undefined;
        }
    }

    private getFrequencyRangeStart(): number {
        const binCount = this._analyser!.frequencyBinCount;
        switch (this._frequencyRange) {
            case 'low': return 0;
            case 'mid': return Math.floor(binCount * 0.1); // Adjusted for better mid response
            case 'high': return Math.floor(binCount * 0.5); // Adjusted for better high response
            default: return 0;
        }
    }

    private getFrequencyRangeEnd(): number {
        const binCount = this._analyser!.frequencyBinCount;
        switch (this._frequencyRange) {
            case 'low': return Math.floor(binCount * 0.1); // Adjusted for better low response
            case 'mid': return Math.floor(binCount * 0.5); // Adjusted for better mid response
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
            
            console.log('Audio debug:', {
                averageAmplitude: this._smoothedAmplitude.toFixed(3),
                peakFrequency: Math.max(...Array.from(this._dataArray))
            });

            requestAnimationFrame(processAudio);
        };

        processAudio();
    }
}
