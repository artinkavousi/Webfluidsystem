import { SceneManager } from '../managers/SceneManager';
import { SimulationManager } from '../managers/SimulationManager';
import { PointEmitter } from '../emitters/PointEmitter';
import { LineEmitter } from '../emitters/LineEmitter';
import { DyeEmitter } from '../emitters/DyeEmitter';
import { AudioManager } from '../managers/AudioManager';
import { Simulation } from '../simulation';
import { Vector2 } from '../types';

export class UIManager {
    private _container: HTMLElement;
    private _sceneManager: Simulation;
    private _simulationManager: Simulation;
    private _audioManager: AudioManager;
    private _panels: Map<string, HTMLElement>;
    private _activePanel: string | null;
    private _simulation: Simulation;

    constructor(
        containerId: string,
        sceneManager: Simulation,
        simulationManager: Simulation,
        audioManager: AudioManager,
        simulation: Simulation
    ) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container with id ${containerId} not found`);
        
        this._container = container;
        this._sceneManager = sceneManager;
        this._simulationManager = simulationManager;
        this._audioManager = audioManager;
        this._panels = new Map();
        this._activePanel = null;
        this._simulation = simulation;

        this.initializeUI();
    }

    private initializeUI(): void {
        this._panels = new Map();

        // Create main control panel
        const mainPanel = document.createElement('div');
        mainPanel.className = 'control-panel main-panel';
        mainPanel.innerHTML = `
            <h2>Main Controls</h2>
            <div class="control-group">
                <label>Simulation Resolution</label>
                <input type="range" min="0" max="1" step="0.1" value="1">
                <span class="value">1</span>
            </div>
            <div class="control-group">
                <label>Dye Resolution</label>
                <input type="range" min="0" max="1" step="0.1" value="1">
                <span class="value">1</span>
            </div>
            <div class="control-group">
                <label>Velocity Dissipation</label>
                <input type="range" min="0" max="4" step="0.1" value="1">
                <span class="value">1</span>
            </div>
            <div class="control-group">
                <label>Density Dissipation</label>
                <input type="range" min="0" max="4" step="0.1" value="1">
                <span class="value">1</span>
            </div>
            <div class="control-group">
                <label>Pressure</label>
                <input type="range" min="0" max="1" step="0.1" value="0.8">
                <span class="value">0.8</span>
            </div>
            <div class="control-group">
                <label>Curl</label>
                <input type="range" min="0" max="50" step="1" value="30">
                <span class="value">30</span>
            </div>
        `;
        this._container.appendChild(mainPanel);
        this._panels.set('main', mainPanel);

        // Create emitter panel
        const emitterPanel = document.createElement('div');
        emitterPanel.className = 'control-panel emitter-panel';
        emitterPanel.innerHTML = `
            <h2>Emitter Controls</h2>
            <div class="control-group">
                <label>Type</label>
                <select>
                    <option value="point">Point Emitter</option>
                    <option value="line">Line Emitter</option>
                    <option value="dye">Dye Emitter</option>
                </select>
            </div>
            <div class="control-group">
                <label>Splat Radius</label>
                <input type="range" min="0.01" max="1" step="0.01" value="0.05">
                <span class="value">0.05</span>
            </div>
            <div class="control-group">
                <label>Splat Force</label>
                <input type="range" min="0" max="1000" step="10" value="50">
                <span class="value">50</span>
            </div>
            <div class="control-group">
                <label>Color</label>
                <input type="color" value="#ff0000">
            </div>
            <div class="control-group">
                <label>Position X</label>
                <input type="range" min="0" max="1" step="0.01" value="0.5">
                <span class="value">0.5</span>
            </div>
            <div class="control-group">
                <label>Position Y</label>
                <input type="range" min="0" max="1" step="0.01" value="0.5">
                <span class="value">0.5</span>
            </div>
            <div class="control-group">
                <label>Direction X</label>
                <input type="range" min="-1" max="1" step="0.01" value="0">
                <span class="value">0</span>
            </div>
            <div class="control-group">
                <label>Direction Y</label>
                <input type="range" min="-1" max="1" step="0.01" value="1">
                <span class="value">1</span>
            </div>
            <div class="control-group">
                <label>Active</label>
                <input type="checkbox" checked>
            </div>
            <div class="control-group">
                <button id="addEmitter">Add Emitter</button>
                <button id="removeEmitter">Remove Emitter</button>
            </div>
            <div class="control-group">
                <label>Active Emitters</label>
                <select id="activeEmitters"></select>
            </div>
        `;
        this._container.appendChild(emitterPanel);
        this._panels.set('emitter', emitterPanel);

        this.createAudioControls(emitterPanel);

        // Setup event listeners after panels are created
        this.setupEventListeners();
    }

    private createAudioControls(emitterPanel: HTMLElement): void {
        const audioControls = document.createElement('div');
        audioControls.className = 'audio-controls';
        audioControls.innerHTML = `
            <div class="control-group">
                <label>
                    <input type="checkbox" class="audio-reactive" checked>
                    Audio Reactive
                </label>
            </div>
            <div class="control-group">
                <label>Frequency Range</label>
                <select class="frequency-range">
                    <option value="low">Low</option>
                    <option value="mid">Mid</option>
                    <option value="high" selected>High</option>
                </select>
            </div>
            <div class="control-group">
                <label>Intensity Multiplier</label>
                <input type="range" class="intensity-multiplier" min="0" max="5" step="0.1" value="2">
                <span class="value">2</span>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" class="affects-force" checked>
                    Affects Force
                </label>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" class="affects-radius" checked>
                    Affects Radius
                </label>
            </div>
            <div class="control-group">
                <label>Min Force</label>
                <input type="range" class="min-force" min="0" max="100" step="1" value="0">
                <span class="value">0</span>
            </div>
            <div class="control-group">
                <label>Max Force</label>
                <input type="range" class="max-force" min="0" max="1000" step="1" value="500">
                <span class="value">500</span>
            </div>
            <div class="control-group">
                <label>Min Radius</label>
                <input type="range" class="min-radius" min="0.01" max="1" step="0.01" value="0.01">
                <span class="value">0.01</span>
            </div>
            <div class="control-group">
                <label>Max Radius</label>
                <input type="range" class="max-radius" min="0.01" max="2" step="0.01" value="1">
                <span class="value">1</span>
            </div>
        `;

        // Add event listeners for all controls
        const audioReactiveCheckbox = audioControls.querySelector('.audio-reactive') as HTMLInputElement;
        const frequencySelect = audioControls.querySelector('.frequency-range') as HTMLSelectElement;
        const intensitySlider = audioControls.querySelector('.intensity-multiplier') as HTMLInputElement;
        const affectsForceCheckbox = audioControls.querySelector('.affects-force') as HTMLInputElement;
        const affectsRadiusCheckbox = audioControls.querySelector('.affects-radius') as HTMLInputElement;

        // Add input event listeners
        audioControls.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', () => {
                this.updateValueDisplay(input as HTMLInputElement);
                this.updateAudioConfig();
            });
        });

        // Add change event listeners for checkboxes and select
        [audioReactiveCheckbox, affectsForceCheckbox, affectsRadiusCheckbox].forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateAudioConfig());
        });
        frequencySelect.addEventListener('change', () => this.updateAudioConfig());

        // Add audio toggle handler
        audioReactiveCheckbox.addEventListener('change', this.handleAudioToggle.bind(this));

        emitterPanel.appendChild(audioControls);
    }

    private async handleAudioToggle(event: Event): Promise<void> {
        const checkbox = event.target as HTMLInputElement;
        const audioControls = checkbox.closest('.audio-controls') as HTMLElement;

        try {
            if (checkbox.checked) {
                await this._audioManager.enableAudio();
                console.log('Audio enabled successfully');
                audioControls.classList.remove('hidden');
                this.updateAudioConfig();
            } else {
                this._audioManager.disable();
                console.log('Audio disabled');
                audioControls.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error toggling audio:', error);
            checkbox.checked = false;
            audioControls.classList.add('hidden');
            alert('Failed to initialize audio. Please ensure microphone permissions are granted and try again.');
        }
    }

    private updateAudioConfig(): void {
        const emitterPanel = this._panels.get('emitter');
        if (emitterPanel) {
            const frequencySelect = emitterPanel.querySelector('.frequency-range') as HTMLSelectElement;
            const intensitySlider = emitterPanel.querySelector('.intensity-multiplier') as HTMLInputElement;
            const affectsForce = emitterPanel.querySelector('.affects-force') as HTMLInputElement;
            const affectsRadius = emitterPanel.querySelector('.affects-radius') as HTMLInputElement;
            const minForceInput = emitterPanel.querySelector('.min-force') as HTMLInputElement;
            const maxForceInput = emitterPanel.querySelector('.max-force') as HTMLInputElement;
            const minRadiusInput = emitterPanel.querySelector('.min-radius') as HTMLInputElement;
            const maxRadiusInput = emitterPanel.querySelector('.max-radius') as HTMLInputElement;

            if (!frequencySelect || !intensitySlider || !affectsForce || !affectsRadius || 
                !minForceInput || !maxForceInput || !minRadiusInput || !maxRadiusInput) {
                console.error('Missing audio control elements');
                return;
            }

            const audioConfig = {
                affectsForce: affectsForce.checked,
                affectsRadius: affectsRadius.checked,
                minForce: parseFloat(minForceInput.value),
                maxForce: parseFloat(maxForceInput.value),
                minRadius: parseFloat(minRadiusInput.value),
                maxRadius: parseFloat(maxRadiusInput.value)
            };

            this._simulation.setAudioConfig(audioConfig);
            console.log('Audio configuration updated:', {
                frequency: frequencySelect.value,
                intensity: intensitySlider.value,
                ...audioConfig
            });
        }
    }

    private setupEventListeners(): void {
        // Add event listeners for main panel
        const mainPanel = this._panels.get('main');
        if (mainPanel) {
            const simulationResolutionInput = mainPanel.querySelector('input[type="range"]') as HTMLInputElement;
            const dyeResolutionInput = mainPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
            const velocityDissipationInput = mainPanel.querySelectorAll('input[type="range"]')[2] as HTMLInputElement;
            const densityDissipationInput = mainPanel.querySelectorAll('input[type="range"]')[3] as HTMLInputElement;
            const pressureInput = mainPanel.querySelectorAll('input[type="range"]')[4] as HTMLInputElement;
            const curlInput = mainPanel.querySelectorAll('input[type="range"]')[5] as HTMLInputElement;

            simulationResolutionInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.simResolution !== undefined) {
                    this._simulation.simResolution = value;
                }
            });

            dyeResolutionInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.dyeResolution !== undefined) {
                    this._simulation.dyeResolution = value;
                }
            });

            velocityDissipationInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.velocityDissipation !== undefined) {
                    this._simulation.velocityDissipation = value;
                }
            });

            densityDissipationInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.densityDissipation !== undefined) {
                    this._simulation.densityDissipation = value;
                }
            });

            pressureInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.pressure !== undefined) {
                    this._simulation.pressure = value;
                }
            });

            curlInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.curl !== undefined) {
                    this._simulation.curl = value;
                }
            });
        }

        // Add event listeners for emitter panel
        const emitterPanel = this._panels.get('emitter');
        if (emitterPanel) {
            const typeSelect = emitterPanel.querySelector('select') as HTMLSelectElement;
            const splatRadiusInput = emitterPanel.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
            const splatForceInput = emitterPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
            const colorInput = emitterPanel.querySelector('input[type="color"]') as HTMLInputElement;
            const posXInput = emitterPanel.querySelectorAll('input[type="range"]')[2] as HTMLInputElement;
            const posYInput = emitterPanel.querySelectorAll('input[type="range"]')[3] as HTMLInputElement;
            const dirXInput = emitterPanel.querySelectorAll('input[type="range"]')[4] as HTMLInputElement;
            const dirYInput = emitterPanel.querySelectorAll('input[type="range"]')[5] as HTMLInputElement;
            const activeCheckbox = emitterPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const addButton = emitterPanel.querySelector('#addEmitter') as HTMLButtonElement;
            const removeButton = emitterPanel.querySelector('#removeEmitter') as HTMLButtonElement;
            const activeEmittersSelect = emitterPanel.querySelector('#activeEmitters') as HTMLSelectElement;

            // Handle emitter type change
            typeSelect?.addEventListener('change', (e) => {
                const type = (e.target as HTMLSelectElement).value;
                this.updateEmitterControls(type);
            });

            // Handle add emitter
            addButton?.addEventListener('click', this.handleAddEmitter);

            // Handle remove emitter
            removeButton?.addEventListener('click', () => {
                const selectedIndex = activeEmittersSelect.selectedIndex;
                if (selectedIndex >= 0) {
                    this._simulation.removeEmitter(selectedIndex);
                    this.updateActiveEmittersList();
                }
            });

            // Handle emitter selection
            activeEmittersSelect?.addEventListener('change', (e) => {
                const selectedIndex = (e.target as HTMLSelectElement).selectedIndex;
                if (selectedIndex >= 0) {
                    const emitter = this._simulation.getEmitter(selectedIndex);
                    if (emitter) {
                        this.updateEmitterControls(emitter);
                    }
                }
            });

            // Update emitter properties when controls change
            const updateEmitterProperties = () => {
                const emitterPanel = this._panels.get('emitter');
                if (emitterPanel) {
                    const activeEmittersSelect = emitterPanel.querySelector('#activeEmitters') as HTMLSelectElement;
                    const selectedIndex = activeEmittersSelect.selectedIndex;
                    if (selectedIndex >= 0) {
                        const typeSelect = emitterPanel.querySelector('select') as HTMLSelectElement;
                        const splatRadiusInput = emitterPanel.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
                        const splatForceInput = emitterPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
                        const colorInput = emitterPanel.querySelector('input[type="color"]') as HTMLInputElement;
                        const posXInput = emitterPanel.querySelectorAll('input[type="range"]')[2] as HTMLInputElement;
                        const posYInput = emitterPanel.querySelectorAll('input[type="range"]')[3] as HTMLInputElement;
                        const dirXInput = emitterPanel.querySelectorAll('input[type="range"]')[4] as HTMLInputElement;
                        const dirYInput = emitterPanel.querySelectorAll('input[type="range"]')[5] as HTMLInputElement;
                        const activeCheckbox = emitterPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;

                        const emitterConfig = {
                            type: typeSelect.value,
                            size: parseFloat(splatRadiusInput.value),
                            force: parseFloat(splatForceInput.value),
                            color: this.hexToRgb(colorInput.value),
                            position: [parseFloat(posXInput.value), parseFloat(posYInput.value)],
                            direction: [parseFloat(dirXInput.value), parseFloat(dirYInput.value)],
                            active: activeCheckbox.checked
                        };

                        this._simulation.updateEmitter(selectedIndex, emitterConfig);
                    }
                }
            };

            // Add change listeners to all emitter controls
            posXInput?.addEventListener('input', updateEmitterProperties);
            posYInput?.addEventListener('input', updateEmitterProperties);
            dirXInput?.addEventListener('input', updateEmitterProperties);
            dirYInput?.addEventListener('input', updateEmitterProperties);
            splatRadiusInput?.addEventListener('input', updateEmitterProperties);
            splatForceInput?.addEventListener('input', updateEmitterProperties);
            colorInput?.addEventListener('input', updateEmitterProperties);
            activeCheckbox?.addEventListener('change', updateEmitterProperties);
        }

        // Add event listeners for rendering panel
        const renderingPanel = this._panels.get('rendering');
        if (renderingPanel) {
            const bloomCheckbox = renderingPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const bloomIntensityInput = renderingPanel.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
            const sunraysCheckbox = renderingPanel.querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement;
            const sunraysWeightInput = renderingPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;

            bloomCheckbox?.addEventListener('change', (e) => {
                const checked = (e.target as HTMLInputElement).checked;
                if (this._simulation.bloom !== undefined) {
                    this._simulation.bloom = checked;
                }
            });

            bloomIntensityInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.bloomIntensity !== undefined) {
                    this._simulation.bloomIntensity = value;
                }
            });

            sunraysCheckbox?.addEventListener('change', (e) => {
                const checked = (e.target as HTMLInputElement).checked;
                if (this._simulation.sunrays !== undefined) {
                    this._simulation.sunrays = checked;
                }
            });

            sunraysWeightInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                if (this._simulation.sunraysWeight !== undefined) {
                    this._simulation.sunraysWeight = value;
                }
            });
        }

        // Add event listeners for audio panel
        const audioPanel = this._panels.get('audio');
        if (audioPanel) {
            const enableAudioCheckbox = audioPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const frequencyRangeInput = audioPanel.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
            const responseIntensityInput = audioPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;

            enableAudioCheckbox?.addEventListener('change', async (e) => {
                const enabled = (e.target as HTMLInputElement).checked;
                if (enabled) {
                    try {
                        await this._audioManager.enableAudio();
                    } catch (error) {
                        console.error('Failed to enable audio:', error);
                        enableAudioCheckbox.checked = false;
                    }
                }
            });

            frequencyRangeInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                this._audioManager.setFrequencyRange(value);
            });

            responseIntensityInput?.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                this._audioManager.setResponseIntensity(value);
            });
        }
    }

    private handleAddEmitter = () => {
        const emitterPanel = this._panels.get('emitter');
        if (emitterPanel) {
            const typeSelect = emitterPanel.querySelector('select') as HTMLSelectElement;
            const splatRadiusInput = emitterPanel.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
            const splatForceInput = emitterPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
            const colorInput = emitterPanel.querySelector('input[type="color"]') as HTMLInputElement;
            const posXInput = emitterPanel.querySelectorAll('input[type="range"]')[2] as HTMLInputElement;
            const posYInput = emitterPanel.querySelectorAll('input[type="range"]')[3] as HTMLInputElement;
            const dirXInput = emitterPanel.querySelectorAll('input[type="range"]')[4] as HTMLInputElement;
            const dirYInput = emitterPanel.querySelectorAll('input[type="range"]')[5] as HTMLInputElement;
            const activeCheckbox = emitterPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;

            const emitterConfig = {
                type: typeSelect.value,
                size: parseFloat(splatRadiusInput.value),
                force: parseFloat(splatForceInput.value),
                color: this.hexToRgb(colorInput.value),
                position: [parseFloat(posXInput.value), parseFloat(posYInput.value)],
                direction: [parseFloat(dirXInput.value), parseFloat(dirYInput.value)],
                active: activeCheckbox.checked
            };

            const index = this._simulation.addEmitter(emitterConfig);
            this.updateActiveEmittersList();
            this.updateEmitterControls(emitterConfig);
        }
    }

    private updateValueDisplay(input: HTMLInputElement): void {
        const valueDisplay = input.parentElement?.querySelector('.value');
        if (valueDisplay) {
            valueDisplay.textContent = input.value;
        }
    }

    private hexToRgb(hex: string): [number, number, number] {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 0, 0];
    }

    private updateActiveEmittersList(): void {
        const activeEmittersSelect = this._panels.get('emitter')?.querySelector('#activeEmitters') as HTMLSelectElement;
        if (activeEmittersSelect) {
            activeEmittersSelect.innerHTML = '';
            const emitters = this._simulation.emitters;
            emitters.forEach((emitter, index) => {
                const option = document.createElement('option');
                option.value = index.toString();
                option.text = `Emitter ${index + 1} (${emitter.type})`;
                activeEmittersSelect.appendChild(option);
            });
        }
    }

    private updateEmitterControls(emitter: any): void {
        const emitterPanel = this._panels.get('emitter');
        if (emitterPanel) {
            const typeSelect = emitterPanel.querySelector('select') as HTMLSelectElement;
            const splatRadiusInput = emitterPanel.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
            const splatForceInput = emitterPanel.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
            const colorInput = emitterPanel.querySelector('input[type="color"]') as HTMLInputElement;
            const posXInput = emitterPanel.querySelectorAll('input[type="range"]')[2] as HTMLInputElement;
            const posYInput = emitterPanel.querySelectorAll('input[type="range"]')[3] as HTMLInputElement;
            const dirXInput = emitterPanel.querySelectorAll('input[type="range"]')[4] as HTMLInputElement;
            const dirYInput = emitterPanel.querySelectorAll('input[type="range"]')[5] as HTMLInputElement;
            const activeCheckbox = emitterPanel.querySelector('input[type="checkbox"]') as HTMLInputElement;

            if (typeof emitter === 'string') {
                // Reset controls for new emitter type
                typeSelect.value = emitter;
                splatRadiusInput.value = '0.05';
                splatForceInput.value = '50';
                colorInput.value = '#ff0000';
                posXInput.value = '0.5';
                posYInput.value = '0.5';
                dirXInput.value = '0';
                dirYInput.value = '1';
                activeCheckbox.checked = true;
            } else if (emitter) {
                // Update controls with existing emitter properties
                typeSelect.value = emitter.type;
                splatRadiusInput.value = emitter.size.toString();
                splatForceInput.value = emitter.force.toString();
                colorInput.value = this.rgbToHex(emitter.color);
                posXInput.value = emitter.position[0].toString();
                posYInput.value = emitter.position[1].toString();
                dirXInput.value = emitter.direction[0].toString();
                dirYInput.value = emitter.direction[1].toString();
                activeCheckbox.checked = emitter.active;
            }
        }
    }

    private rgbToHex(rgb: [number, number, number]): string {
        const toHex = (n: number) => {
            const hex = Math.round(n * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
    }
}
