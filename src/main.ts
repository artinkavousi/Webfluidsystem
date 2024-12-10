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
        // Create container
        this._container = document.createElement('div');
        this._container.style.position = 'fixed';
        this._container.style.top = '0';
        this._container.style.left = '0';
        this._container.style.width = '100%';
        this._container.style.height = '100%';
        document.body.appendChild(this._container);

        // Create canvas with proper size
        this._canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this._canvas.width = width * dpr;
        this._canvas.height = height * dpr;
        this._canvas.style.width = width + 'px';
        this._canvas.style.height = height + 'px';
        this._container.appendChild(this._canvas);

        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        document.body.appendChild(uiContainer);

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
    }

    private handleResize(): void {
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this._canvas.width = width * dpr;
        this._canvas.height = height * dpr;
        this._canvas.style.width = width + 'px';
        this._canvas.style.height = height + 'px';
        this._simulation.resize();
    }

    async initialize(): Promise<void> {
        try {
            // Initialize audio
            await this._audioManager.initialize();

            // Start the simulation
            this._simulation.start();

            // Optional: Add some initial splats
            this._simulation.multipleSplats(parseInt((Math.random() * 20).toString()) + 5);
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
const simulation = new FluidSimulation();
simulation.initialize().catch(console.error);
