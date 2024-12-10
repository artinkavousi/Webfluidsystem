export class CollisionUtils {
    static createCollisionMask(
        width: number,
        height: number,
        shapes: Array<{
            type: 'circle' | 'rectangle' | 'polygon';
            params: any;
        }>
    ): ImageData {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        // Draw shapes in white
        ctx.fillStyle = 'white';
        
        for (const shape of shapes) {
            ctx.beginPath();
            
            switch (shape.type) {
                case 'circle':
                    const { x, y, radius } = shape.params;
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    break;
                    
                case 'rectangle':
                    const { x: rx, y: ry, width: rw, height: rh } = shape.params;
                    ctx.rect(rx, ry, rw, rh);
                    break;
                    
                case 'polygon':
                    const { points } = shape.params;
                    if (points.length < 3) continue;
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.closePath();
                    break;
            }
            
            ctx.fill();
        }

        return ctx.getImageData(0, 0, width, height);
    }

    static isPointInMask(
        mask: ImageData,
        x: number,
        y: number
    ): boolean {
        const index = (Math.floor(y) * mask.width + Math.floor(x)) * 4;
        return mask.data[index] > 0;
    }

    static applyMaskToVelocity(
        mask: ImageData,
        velocityField: Float32Array,
        width: number,
        height: number
    ): void {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const maskIndex = (y * width + x) * 4;
                const velocityIndex = (y * width + x) * 2;

                if (mask.data[maskIndex] > 0) {
                    // Zero out velocity at collision points
                    velocityField[velocityIndex] = 0;     // x velocity
                    velocityField[velocityIndex + 1] = 0; // y velocity
                }
            }
        }
    }

    static createSoftCollisionField(
        mask: ImageData,
        radius: number
    ): Float32Array {
        const width = mask.width;
        const height = mask.height;
        const field = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let maxInfluence = 0;

                // Check surrounding pixels within radius
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const px = x + dx;
                        const py = y + dy;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist <= radius) {
                                const maskIndex = (py * width + px) * 4;
                                if (mask.data[maskIndex] > 0) {
                                    const influence = 1 - (dist / radius);
                                    maxInfluence = Math.max(maxInfluence, influence);
                                }
                            }
                        }
                    }
                }

                field[y * width + x] = maxInfluence;
            }
        }

        return field;
    }
}
