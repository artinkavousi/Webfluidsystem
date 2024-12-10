export const vertexShader = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

export const advectionShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }
`;

export const divergenceShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

export const pressureShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

export const gradientSubtractShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

export const displayShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uGradient;
    uniform float uOpacity;
    uniform int uRenderMode;

    void main () {
        vec4 color = texture2D(uTexture, vUv);
        
        if (uRenderMode == 0) { // Gradient mode
            float t = length(color.xyz);
            vec4 gradientColor = texture2D(uGradient, vec2(t, 0.5));
            gl_FragColor = vec4(gradientColor.rgb, gradientColor.a * uOpacity);
        }
        else if (uRenderMode == 1) { // Emitter color mode
            gl_FragColor = vec4(color.rgb, color.a * uOpacity);
        }
        else if (uRenderMode == 2) { // Background color mode
            gl_FragColor = vec4(color.rgb * 0.5 + 0.5, uOpacity);
        }
        else { // Distortion mode
            vec2 distortion = (color.xy - 0.5) * 2.0;
            vec2 distortedUv = vUv + distortion * 0.1;
            vec4 distortedColor = texture2D(uTexture, distortedUv);
            gl_FragColor = vec4(distortedColor.rgb, distortedColor.a * uOpacity);
        }
    }
`;

export const emitterShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform vec3 uColor;
    uniform vec2 uPosition;
    uniform float uSize;
    uniform float uIntensity;

    void main () {
        float d = distance(vUv, uPosition);
        float a = smoothstep(uSize, 0.0, d) * uIntensity;
        gl_FragColor = vec4(uColor, a);
    }
`;

export const lineEmitterShader = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform vec3 uColor;
    uniform vec2 uStart;
    uniform vec2 uEnd;
    uniform float uThickness;
    uniform float uIntensity;

    float lineDistance(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * t);
    }

    void main () {
        float d = lineDistance(vUv, uStart, uEnd);
        float a = smoothstep(uThickness, 0.0, d) * uIntensity;
        gl_FragColor = vec4(uColor, a);
    }
`;
