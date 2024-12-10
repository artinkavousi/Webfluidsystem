export class AudioManager {
    private _audioContext: AudioContext | null;
    private _analyser: AnalyserNode | null;
    private _mediaStream: MediaStream | null;
    private _dataArray: Uint8Array;
    private _isEnabled: boolean;
    private _frequencyRange: 'low' | 'mid' | 'high';
    private _intensity: number;

    constructor() {
        this._audioContext = null;
        this._analyser = null;
        this._mediaStream = null;
        this._dataArray = new Uint8Array(0);
        this._isEnabled = false;
        this._frequencyRange = 'mid';
        this._intensity = 1.0;
    }

    async enableAudio(): Promise<void> {
        if (this._isEnabled) return;

        try {
            this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._audioContext = new AudioContext();
            this._analyser = this._audioContext.createAnalyser();

            const source = this._audioContext.createMediaStreamSource(this._mediaStream);
            source.connect(this._analyser);

            this._analyser.fftSize = 2048;
            const bufferLength = this._analyser.frequencyBinCount;
            this._dataArray = new Uint8Array(bufferLength);

            this._isEnabled = true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this._isEnabled = false;
            throw error;
        }
    }

    async initialize(): Promise<void> {
        // No automatic audio initialization
        this._isEnabled = false;
    }

    setFrequencyRange(range: 'low' | 'mid' | 'high'): void {
        this._frequencyRange = range;
    }

    setIntensity(intensity: number): void {
        this._intensity = Math.max(0, Math.min(2, intensity));
    }

    getAudioData(): { frequency: number; amplitude: number } {
        if (!this._isEnabled || !this._analyser) {
            return { frequency: 0, amplitude: 0 };
        }

        this._analyser.getByteFrequencyData(this._dataArray);

        // Define frequency ranges
        const ranges = {
            low: { start: 0, end: 256 },
            mid: { start: 256, end: 512 },
            high: { start: 512, end: 1024 }
        };

        const range = ranges[this._frequencyRange];
        let sum = 0;
        let peak = 0;
        let peakIndex = 0;

        // Calculate average amplitude and find peak frequency in the selected range
        for (let i = range.start; i < range.end; i++) {
            const value = this._dataArray[i];
            sum += value;
            if (value > peak) {
                peak = value;
                peakIndex = i;
            }
        }

        const avgAmplitude = sum / (range.end - range.start) / 255; // Normalize to 0-1
        const normalizedFrequency = (peakIndex - range.start) / (range.end - range.start);

        return {
            frequency: normalizedFrequency * this._intensity,
            amplitude: avgAmplitude * this._intensity
        };
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
}
