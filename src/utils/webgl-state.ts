export class WebGLState {
  private static instance: WebGLState;
  private gl: WebGL2RenderingContext;

  // Current state tracking
  private currentProgram: WebGLProgram | null = null;
  private currentBlendEnabled: boolean = false;
  private currentDepthTestEnabled: boolean = false;
  private currentCullFaceEnabled: boolean = false;
  private currentViewport: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  private boundTextures: Map<number, WebGLTexture | null> = new Map();
  private boundFramebuffer: WebGLFramebuffer | null = null;
  private currentBlendFunc = {
    src: 0,
    dst: 0,
  };

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.reset();
  }

  public static getInstance(gl: WebGL2RenderingContext): WebGLState {
    if (!WebGLState.instance) {
      WebGLState.instance = new WebGLState(gl);
    }
    return WebGLState.instance;
  }

  public reset(): void {
    this.currentProgram = null;
    this.currentBlendEnabled = false;
    this.currentDepthTestEnabled = false;
    this.currentCullFaceEnabled = false;
    this.currentViewport = { x: 0, y: 0, width: 0, height: 0 };
    this.boundTextures.clear();
    this.boundFramebuffer = null;
    this.currentBlendFunc = { src: 0, dst: 0 };
  }

  public useProgram(program: WebGLProgram | null): void {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
    }
  }

  public bindFramebuffer(target: number, framebuffer: WebGLFramebuffer | null): void {
    if (this.boundFramebuffer !== framebuffer) {
      this.gl.bindFramebuffer(target, framebuffer);
      this.boundFramebuffer = framebuffer;
    }
  }

  public bindTexture(target: number, unit: number, texture: WebGLTexture | null): void {
    const key = target + unit;
    if (this.boundTextures.get(key) !== texture) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.gl.bindTexture(target, texture);
      this.boundTextures.set(key, texture);
    }
  }

  public viewport(x: number, y: number, width: number, height: number): void {
    const viewport = this.currentViewport;
    if (
      viewport.x !== x ||
      viewport.y !== y ||
      viewport.width !== width ||
      viewport.height !== height
    ) {
      this.gl.viewport(x, y, width, height);
      viewport.x = x;
      viewport.y = y;
      viewport.width = width;
      viewport.height = height;
    }
  }

  public blendFunc(src: number, dst: number): void {
    if (this.currentBlendFunc.src !== src || this.currentBlendFunc.dst !== dst) {
      this.gl.blendFunc(src, dst);
      this.currentBlendFunc.src = src;
      this.currentBlendFunc.dst = dst;
    }
  }

  public enable(cap: number): void {
    switch (cap) {
      case this.gl.BLEND:
        if (!this.currentBlendEnabled) {
          this.gl.enable(cap);
          this.currentBlendEnabled = true;
        }
        break;
      case this.gl.DEPTH_TEST:
        if (!this.currentDepthTestEnabled) {
          this.gl.enable(cap);
          this.currentDepthTestEnabled = true;
        }
        break;
      case this.gl.CULL_FACE:
        if (!this.currentCullFaceEnabled) {
          this.gl.enable(cap);
          this.currentCullFaceEnabled = true;
        }
        break;
    }
  }

  public disable(cap: number): void {
    switch (cap) {
      case this.gl.BLEND:
        if (this.currentBlendEnabled) {
          this.gl.disable(cap);
          this.currentBlendEnabled = false;
        }
        break;
      case this.gl.DEPTH_TEST:
        if (this.currentDepthTestEnabled) {
          this.gl.disable(cap);
          this.currentDepthTestEnabled = false;
        }
        break;
      case this.gl.CULL_FACE:
        if (this.currentCullFaceEnabled) {
          this.gl.disable(cap);
          this.currentCullFaceEnabled = false;
        }
        break;
    }
  }

  public clear(mask: number): void {
    this.gl.clear(mask);
  }

  public clearColor(r: number, g: number, b: number, a: number): void {
    this.gl.clearColor(r, g, b, a);
  }
} 