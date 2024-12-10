export class PerspectiveUtils {
    static createPerspectiveMatrix(
        fieldOfView: number,
        aspect: number,
        near: number,
        far: number
    ): number[] {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfView);
        const rangeInv = 1.0 / (near - far);

        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
    }

    static createOrthographicMatrix(
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        far: number
    ): number[] {
        return [
            2 / (right - left), 0, 0, 0,
            0, 2 / (top - bottom), 0, 0,
            0, 0, 2 / (near - far), 0,
            (left + right) / (left - right),
            (bottom + top) / (bottom - top),
            (near + far) / (near - far),
            1
        ];
    }

    static multiplyMatrices(a: number[], b: number[]): number[] {
        const result = new Array(16);
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a[i * 4 + k] * b[k * 4 + j];
                }
                result[i * 4 + j] = sum;
            }
        }
        
        return result;
    }

    static createTransformMatrix(
        x: number,
        y: number,
        scale: number,
        rotation: number
    ): number[] {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        return [
            scale * cos, scale * -sin, 0, 0,
            scale * sin, scale * cos, 0, 0,
            0, 0, 1, 0,
            x, y, 0, 1
        ];
    }
}
