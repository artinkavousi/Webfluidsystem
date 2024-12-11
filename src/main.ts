import { Simulation } from './simulation';
import { AudioManager } from './audio/AudioManager';
import { UIManager } from './ui/UIManager';
import './ui/styles.css';

class FluidSimulation {
    private _container: HTMLDivElement;
    private _canvas: HTMLCanvasElement;
    private _simulation: Simulation;
    private _audioManager: AudioManager;
    private _uiManager: UIManager;

    constructor() {
        console.log('Initializing FluidSimulation...');
        
        // Create container
        this._container = document.createElement('div');
        this._container.style.position = 'fixed';
        this._container.style.top = '0';
        this._container.style.left = '0';
        this._container.style.width = '100%';
        this._container.style.height = '100%';
        this._container.style.overflow = 'hidden';
        document.body.appendChild(this._container);

        // Create canvas with proper size
        this._canvas = document.createElement('canvas');
        this._canvas.style.position = 'absolute';
        this._canvas.style.width = '100%';
        this._canvas.style.height = '100%';
        this._container.appendChild(this._canvas);

        // Set initial canvas size
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this._canvas.width = width * dpr;
        this._canvas.height = height * dpr;

        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        document.body.appendChild(uiContainer);

        console.log('Creating simulation...');
        // Create simulation and managers
        this._simulation = new Simulation(this._container);
        this._audioManager = new AudioManager();
        this._uiManager = new UIManager(
            'ui-container',
            this._simulation,
            this._simulation,
            this._audioManager,
            this._simulation
        );

        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        console.log('FluidSimulation initialized');
    }

    private handleResize(): void {
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update canvas size
        this._canvas.width = width * dpr;
        this._canvas.height = height * dpr;
        this._canvas.style.width = width + 'px';
        this._canvas.style.height = height + 'px';
        
        // Only call simulation.resize if simulation is initialized
        if (this._simulation && typeof this._simulation.resize === 'function') {
            this._simulation.resize();
        }
    }

    async initialize(): Promise<void> {
        try {
            console.log('Initializing fluid simulation...');
            
            // First start the simulation
            this._simulation.start();
            console.log('Simulation started');

            // Initialize audio with retry mechanism
            let audioInitialized = false;
            const maxRetries = 3;
            let retryCount = 0;

            while (!audioInitialized && retryCount < maxRetries) {
                try {
                    await this._audioManager.enableAudio();
                    console.log('Audio initialized successfully');
                    audioInitialized = true;
                } catch (audioError) {
                    retryCount++;
                    console.warn(`Audio initialization attempt ${retryCount} failed:`, audioError);
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                }
            }

            if (!audioInitialized) {
                console.warn('Audio initialization failed after all retries');
            }

            // Create initial splats
            setTimeout(() => {
                this._simulation.multipleSplats(parseInt((Math.random() * 20).toString()) + 5);
                console.log('Initial splats created');
            }, 100);

            console.log('Initialization complete');
        } catch (error) {
            console.error('Failed to initialize fluid simulation:', error);
            throw error;
        }
    }

    dispose(): void {
        this._simulation.stop();
        this._audioManager.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
        if (this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
    }
}

// Initialize simulation
document.addEventListener('DOMContentLoaded', () => {
    const simulation = new FluidSimulation();
    simulation.initialize().then(() => {
        console.log('Fluid simulation initialized successfully');
    }).catch(error => {
        console.error('Failed to initialize fluid simulation:', error);
    });
});
