export class EmitterManager {
    private _emitters: any[] = [];

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
