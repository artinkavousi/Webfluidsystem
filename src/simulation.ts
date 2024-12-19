import { Color } from './color';
import { defaultConfig } from './config';
import { Material } from './material';
import { Pointer } from './pointer';
import { Programs } from './programs';
import { Screenshot } from './screenshot';
import { Shaders } from './shaders';
import { Texture } from './texture';
import { EmitterManager } from './emitterManager';
import { PerformanceMonitor } from './utils/performance';
import { ResourceManager } from './utils/resource-manager';
import { WebGLState } from './utils/webgl-state';
import { QualityManager } from './utils/quality-manager';
import type {
  DoubleFBO,
  ExtraContext,
  FBO,
  RGBColor,
  TextureInfo,
} from './types';

class Simulation {
  public hasStarted = false;
  public simResolution = defaultConfig.simResolution;
  public dyeResolution = defaultConfig.dyeResolution;
  public captureResolution = defaultConfig.captureResolution;
  public densityDissipation = defaultConfig.densityDissipation;
  public velocityDissipation = defaultConfig.velocityDissipation;
  public pressure = defaultConfig.pressure;
  public pressureIterations = defaultConfig.pressureIterations;
  public curl = defaultConfig.curl;
  public splatRadius = defaultConfig.splatRadius;
  public splatForce = defaultConfig.splatForce;
  public shading = defaultConfig.shading;
  public colorful = defaultConfig.colorful;
  public colorUpdateSpeed = defaultConfig.colorUpdateSpeed;
  public colorPalette: string[] = defaultConfig.colorPalette;
  public hover = defaultConfig.hover;
  public backgroundColor = defaultConfig.backgroundColor;
  public transparent = defaultConfig.transparent;
  public brightness = defaultConfig.brightness;
  public bloom = defaultConfig.bloom;
  public bloomIterations = defaultConfig.bloomIterations;
  public bloomResolution = defaultConfig.bloomResolution;
  public bloomIntensity = defaultConfig.bloomIntensity;
  public bloomThreshold = defaultConfig.bloomThreshold;
  public bloomSoftKnee = defaultConfig.bloomSoftKnee;
  public sunrays = defaultConfig.sunrays;
  public sunraysResolution = defaultConfig.sunraysResolution;
  public sunraysWeight = defaultConfig.sunraysWeight;
  public paused = false;
  public drawWhilePaused = false;
  private _inverted = false;
  public canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private ext: ExtraContext;
  private splatStack: number[] = [];
  private pointers: Pointer[] = [];
  private programs: Programs;
  private bloomFramebuffers: FBO[] = [];
  private ditheringTexture: TextureInfo;
  private displayMaterial: Material;
  private lastUpdateTime: number = Date.now();
  private colorUpdateTimer = 0.0;
  private _dye!: DoubleFBO;
  private _velocity!: DoubleFBO;
  private _divergence!: FBO;
  private _curl!: FBO;
  private _pressure!: DoubleFBO;
  private _bloom!: FBO;
  private _sunrays!: FBO;
  private _sunraysTemp!: FBO;
  private animationFrameId!: number;
  private _emitterManager: EmitterManager;
  private performanceMonitor: PerformanceMonitor;
  private resourceManager: ResourceManager;
  private webglState: WebGLState;
  private qualityManager: QualityManager;

  constructor(container: HTMLElement) {
    try {
      let canvas = container.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        container.appendChild(canvas);
      }
      this.canvas = canvas;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';

      // Initialize WebGL context
      const { gl, ext } = this.getWebGLContext();
      if (!gl) {
        throw new Error('Failed to initialize WebGL context');
      }
      this.gl = gl;
      this.ext = ext;

      // Initialize managers
      this.performanceMonitor = PerformanceMonitor.getInstance(this.gl);
      this.resourceManager = ResourceManager.getInstance(this.gl);
      this.webglState = WebGLState.getInstance(this.gl);
      this.qualityManager = QualityManager.getInstance();

      // Initial resize
      this.resize();

      // Initialize base configuration
      if (this.isMobile()) {
        this.dyeResolution /= 2;
      }
      if (!this.ext.supportLinearFiltering) {
        this.dyeResolution /= 2;
        this.shading = false;
        this.bloom = false;
        this.sunrays = false;
      }

      // Initialize shaders and programs
      const shaders = new Shaders(this.gl, this.ext);
      this.blitInit();
      this.ditheringTexture = Texture.ditheringTexture(this.gl);
      this.programs = new Programs(this.gl, shaders);

      this.displayMaterial = new Material(
        shaders.baseVertexShader,
        shaders.displayShaderSource,
        this.gl,
      );

      // Initialize EmitterManager with this simulation instance
      this._emitterManager = new EmitterManager(this);

      // Bind event listeners
      canvas.addEventListener('mousedown', this.handleMouseDown);
      canvas.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('mouseup', this.handleMouseUp);

      canvas.addEventListener('touchstart', this.handleTouchStart);
      canvas.addEventListener('touchmove', this.handleTouchMove);
      window.addEventListener('touchend', this.handleTouchEnd);

      this.inverted = defaultConfig.inverted;
      this.update = this.update.bind(this);

      // Check for any WebGL errors after initialization
      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        throw new Error(`WebGL error after initialization: ${error}`);
      }

    } catch (error) {
      console.error('Failed to initialize simulation:', error);
      throw error;
    }
  }

  public start() {
    try {
      if (this.hasStarted) {
        console.log('Simulation already started');
        return;
      }

      console.log('Starting simulation...');
      
      // Check if WebGL context is valid
      if (!this.gl) {
        throw new Error('WebGL context not initialized');
      }

      // Initialize pointers
      this.pointers = [new Pointer(this.colorPalette, this.brightness)];

      // Clear any existing WebGL errors
      while (this.gl.getError() !== this.gl.NO_ERROR) {
        // Clear error queue
      }

      // Initialize framebuffers
      try {
        this.updateKeywords();
        this.initFramebuffers();
      } catch (error) {
        console.error('Failed to initialize framebuffers:', error);
        throw new Error(`Failed to initialize framebuffers: ${error.message}`);
      }

      // Check for WebGL errors after framebuffer initialization
      const error = this.gl.getError();
      if (error !== this.gl.NO_ERROR) {
        throw new Error(`WebGL error after framebuffer initialization: ${error}`);
      }

      // Ensure canvas is properly sized
      this.resize();

      // Start the animation loop
      this.lastUpdateTime = Date.now();
      this.update();

      // Create some initial splats
      setTimeout(() => {
        try {
          this.multipleSplats(parseInt((Math.random() * 20).toString()) + 5);
        } catch (error) {
          console.error('Error creating initial splats:', error);
        }
      }, 100);

      this.hasStarted = true;
      console.log('Simulation started successfully');
    } catch (error) {
      console.error('Failed to start simulation:', error);
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any) {
    // Log the error
    console.error('Simulation error:', error);

    // Clean up resources
    try {
      this.cleanup();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Reset state
    this.hasStarted = false;
    this.paused = true;

    // Try to reinitialize if possible
    try {
      this.initializeWebGL();
    } catch (reinitError) {
      console.error('Failed to reinitialize WebGL:', reinitError);
    }
  }

  private initializeWebGL() {
    try {
      // Get WebGL context with error checking
      const { gl, ext } = this.getWebGLContext();
      this.gl = gl;
      this.ext = ext;

      // Initialize managers
      this.performanceMonitor = PerformanceMonitor.getInstance(this.gl);
      this.resourceManager = ResourceManager.getInstance(this.gl);
      this.webglState = WebGLState.getInstance(this.gl);
      this.qualityManager = QualityManager.getInstance();

      // Initialize shaders
      const shaders = new Shaders(this.gl, this.ext);
      this.blitInit();
      this.ditheringTexture = Texture.ditheringTexture(this.gl);
      this.programs = new Programs(this.gl, shaders);

      // Check for WebGL errors after initialization
      const error = this.gl.getError();
      if (error !== this.gl.NO_ERROR) {
        throw new Error(`WebGL error after initialization: ${error}`);
      }

      console.log('WebGL initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebGL:', error);
      throw error;
    }
  }

  private cleanup() {
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Release resources
    if (this.resourceManager) {
      if (this._dye) {
        this.resourceManager.releaseResource(this._dye.read.texture, 'texture');
        this.resourceManager.releaseResource(this._dye.write.texture, 'texture');
      }
      if (this._velocity) {
        this.resourceManager.releaseResource(this._velocity.read.texture, 'texture');
        this.resourceManager.releaseResource(this._velocity.write.texture, 'texture');
      }
      // Release other resources...
    }

    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    }
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('touchend', this.handleTouchEnd);
  }

  public stop() {
    this.pointers = [];

    cancelAnimationFrame(this.animationFrameId);

    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);

    this.hasStarted = false;

    // Cleanup resources
    this.resourceManager.releaseResource(this._dye.read.texture, 'texture');
    this.resourceManager.releaseResource(this._dye.write.texture, 'texture');
    this.resourceManager.releaseResource(this._velocity.read.texture, 'texture');
    this.resourceManager.releaseResource(this._velocity.write.texture, 'texture');
    // ... release other resources ...
  }

  private handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const posX = this.scaleByPixelRatio(event.clientX - rect.left);
    const posY = this.scaleByPixelRatio(event.clientY - rect.top);
    
    let pointer = this.pointers.find((p) => p.id === -1);
    if (!pointer) {
      pointer = new Pointer(this.colorPalette, this.brightness);
      this.pointers.push(pointer);
    }
    
    pointer.updatePointerDownData(
      -1,
      posX,
      posY,
      this.canvas,
      this.colorPalette,
      this.brightness,
    );

    // Add mouse emitter
    pointer.emitterId = this._emitterManager.addMouseEmitter(
      posX / this.canvas.width,
      posY / this.canvas.height,
      this.splatForce,
      this.splatRadius
    );
  };

  private handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const posX = this.scaleByPixelRatio(event.clientX - rect.left);
    const posY = this.scaleByPixelRatio(event.clientY - rect.top);
    
    let pointer = this.pointers.find((p) => p.id === -1);
    if (!pointer) {
      pointer = new Pointer(this.colorPalette, this.brightness);
      this.pointers.push(pointer);
    }
    
    pointer.updatePointerMoveData(posX, posY, this.canvas, this.hover);

    // Update mouse emitter if it exists
    if (pointer.emitterId !== undefined) {
      const dx = posX - pointer.prevX;
      const dy = posY - pointer.prevY;
      this._emitterManager.updateMouseEmitter(
        pointer.emitterId,
        posX / this.canvas.width,
        posY / this.canvas.height,
        dx / this.canvas.width,
        dy / this.canvas.height
      );
    }
  };

  private handleMouseUp = (event: MouseEvent) => {
    event.preventDefault();
    const pointer = this.pointers.find((p) => p.id === -1);
    if (pointer) {
      pointer.updatePointerUpData();
      // Deactivate mouse emitter
      if (pointer.emitterId !== undefined) {
        this._emitterManager.deactivateMouseEmitter(pointer.emitterId);
        pointer.emitterId = undefined;
      }
    }
  };

  private handleTouchStart = (event: TouchEvent) => {
    const touches = event.targetTouches;
    while (touches.length >= this.pointers.length)
      this.pointers.push(new Pointer(this.colorPalette, this.brightness));
    for (let i = 0; i < touches.length; i++) {
      const posX = this.scaleByPixelRatio(touches[i]!.pageX);
      const posY = this.scaleByPixelRatio(touches[i]!.pageY);
      this.pointers[i + 1]!.updatePointerDownData(
        touches[i]!.identifier,
        posX,
        posY,
        this.canvas,
        this.colorPalette,
        this.brightness,
      );
    }
  };

  private handleTouchMove = (event: TouchEvent) => {
    const touches = event.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      const pointer = this.pointers[i + 1]!;
      const posX = this.scaleByPixelRatio(touches[i]!.pageX);
      const posY = this.scaleByPixelRatio(touches[i]!.pageY);
      pointer.updatePointerMoveData(posX, posY, this.canvas, this.hover);
    }
  };

  private handleTouchEnd = (event: TouchEvent) => {
    const touches = event.changedTouches;
    for (const touch of touches) {
      const pointer = this.pointers.find(
        (pointer) => pointer.id === touch.identifier,
      );
      if (!pointer) continue;
      pointer.updatePointerUpData();
    }
  };

  private scaleByPixelRatio(input: number): number {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  public resize(): void {
    if (!this.gl) {
      console.warn('Cannot resize: WebGL context not initialized');
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(this.gl.canvas.clientWidth * dpr);
    const height = Math.floor(this.gl.canvas.clientHeight * dpr);

    if (this.gl.canvas.width !== width || this.gl.canvas.height !== height) {
      // Update canvas size
      this.gl.canvas.width = width;
      this.gl.canvas.height = height;

      // Update viewport
      this.gl.viewport(0, 0, width, height);

      // Reinitialize framebuffers if they exist
      if (this._dye && this._velocity) {
        try {
          this.initFramebuffers();
        } catch (error) {
          console.error('Error reinitializing framebuffers during resize:', error);
        }
      }

      console.log('Simulation resized:', { width, height, dpr });
    }
  }

  private supportRenderTextureFormat(
    gl: WebGL2RenderingContext,
    internalFormat: number,
    format: number,
    type: number,
  ): boolean {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      4,
      4,
      0,
      format,
      type,
      null,
    );

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status == gl.FRAMEBUFFER_COMPLETE;
  }

  private getSupportedFormat(
    gl: WebGL2RenderingContext,
    internalFormat: number,
    format: number,
    type: number,
  ): { internalFormat: number; format: number } | null {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return this.getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }

    return {
      internalFormat,
      format,
    };
  }

  private getWebGLContext(): { gl: WebGL2RenderingContext; ext: ExtraContext } {
    const params: WebGLContextAttributes = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    };

    // Try WebGL 2 first
    let gl = this.canvas.getContext('webgl2', params);
    if (!gl) {
      // Fall back to WebGL 1
      gl = this.canvas.getContext('webgl', params) ||
           this.canvas.getContext('experimental-webgl', params);
      
      if (!gl) {
        throw new Error('WebGL not supported');
      }
    }

    // Clear any existing errors
    while (gl.getError() !== gl.NO_ERROR) {
      // Clear error queue
    }

    // Check for required extensions
    let halfFloat;
    let supportLinearFiltering;
    const isWebGL2 = gl instanceof WebGL2RenderingContext;

    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('OES_texture_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }

    // Clear with transparent black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Get texture formats
    let halfFloatTexType;
    let formatRGBA;
    let formatRG;
    let formatR;

    if (isWebGL2) {
      halfFloatTexType = gl.HALF_FLOAT;
      formatRGBA = { internalFormat: gl.RGBA16F, format: gl.RGBA };
      formatRG = { internalFormat: gl.RG16F, format: gl.RG };
      formatR = { internalFormat: gl.R16F, format: gl.RED };

      // Test if floating point textures are supported
      const testTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, testTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, halfFloatTexType, null);
      
      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        console.warn('Floating point textures not supported, falling back to 8-bit textures');
        halfFloatTexType = gl.UNSIGNED_BYTE;
        formatRGBA = { internalFormat: gl.RGBA8, format: gl.RGBA };
        formatRG = { internalFormat: gl.RGBA8, format: gl.RGBA };
        formatR = { internalFormat: gl.RGBA8, format: gl.RGBA };
      }

      gl.deleteTexture(testTexture);
    } else {
      halfFloatTexType = halfFloat ? halfFloat.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
      formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA };
      formatRG = { internalFormat: gl.RGBA, format: gl.RGBA };
      formatR = { internalFormat: gl.RGBA, format: gl.RGBA };
    }

    // Enable required WebGL features
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return {
      gl: gl as WebGL2RenderingContext,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering: !!supportLinearFiltering,
      },
    };
  }

  private isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  public updateKeywords() {
    const displayKeywords: string[] = [];
    if (this.shading) displayKeywords.push('SHADING');
    if (this.bloom) displayKeywords.push('BLOOM');
    if (this.sunrays) displayKeywords.push('SUNRAYS');
    this.displayMaterial.setKeywords(displayKeywords);
  }

  public initFramebuffers() {
    const simRes = this.getResolution(this.simResolution);
    const dyeRes = this.getResolution(this.dyeResolution);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    
    // Ensure we're using valid formats
    const isWebGL2 = this.gl instanceof WebGL2RenderingContext;
    const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST;

    // Adjust formats for WebGL 1
    if (!isWebGL2) {
      rgba.internalFormat = this.gl.RGBA;
      rg.internalFormat = this.gl.RGBA;
      r.internalFormat = this.gl.RGBA;
      rgba.format = this.gl.RGBA;
      rg.format = this.gl.RGBA;
      r.format = this.gl.RGBA;
    }

    this.gl.disable(this.gl.BLEND);

    try {
      if (!this._dye) {
        this._dye = this.createDoubleFBO(
          dyeRes.width,
          dyeRes.height,
          rgba.internalFormat,
          rgba.format,
          texType,
          filtering,
        );
      } else {
        this._dye = this.resizeDoubleFBO(
          this._dye,
          dyeRes.width,
          dyeRes.height,
          rgba.internalFormat,
          rgba.format,
          texType,
          filtering,
        );
      }

      if (!this._velocity) {
        this._velocity = this.createDoubleFBO(
          simRes.width,
          simRes.height,
          rg.internalFormat,
          rg.format,
          texType,
          filtering,
        );
      } else {
        this._velocity = this.resizeDoubleFBO(
          this._velocity,
          simRes.width,
          simRes.height,
          rg.internalFormat,
          rg.format,
          texType,
          filtering,
        );
      }

      this._divergence = this.createFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        this.gl.NEAREST,
      );

      this._curl = this.createFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        this.gl.NEAREST,
      );

      this._pressure = this.createDoubleFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        this.gl.NEAREST,
      );

      // Check framebuffer status
      const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
      if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Framebuffer is incomplete: ${status}`);
      }

    } catch (error) {
      console.error('Error initializing framebuffers:', error);
      throw error;
    }

    this.initBloomFramebuffers();
    this.initSunraysFramebuffers();
  }

  private getResolution(resolution: number): {
    width: number;
    height: number;
  } {
    let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    if (aspectRatio < 1) {
      aspectRatio = 1.0 / aspectRatio;
    }

    // Ensure minimum resolution
    const minResolution = 64;
    const baseResolution = Math.max(resolution, minResolution);

    // Calculate dimensions
    let width: number;
    let height: number;

    if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) {
      width = Math.round(baseResolution * aspectRatio);
      height = Math.round(baseResolution);
    } else {
      width = Math.round(baseResolution);
      height = Math.round(baseResolution * aspectRatio);
    }

    // Ensure dimensions are non-zero and power of 2
    width = Math.max(this.nextPowerOfTwo(width), minResolution);
    height = Math.max(this.nextPowerOfTwo(height), minResolution);

    return { width, height };
  }

  private nextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  private createDoubleFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number,
  ): DoubleFBO {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  private resizeFBO(
    target: FBO,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number,
  ): FBO {
    const newFBO = this.createFBO(w, h, internalFormat, format, type, param);
    this.programs.copyProgram.bind();
    this.gl.uniform1i(
      this.programs.copyProgram.uniforms.uTexture!,
      target.attach(0),
    );
    this.blit(newFBO);
    return newFBO;
  }

  private resizeDoubleFBO(
    target: DoubleFBO,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number,
  ): DoubleFBO {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(
      target.read,
      w,
      h,
      internalFormat,
      format,
      type,
      param,
    );
    target.write = this.createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  private createFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number,
  ): FBO {
    const gl = this.gl;

    // Validate dimensions
    if (w <= 0 || h <= 0) {
      throw new Error(`Invalid texture dimensions: ${w}x${h}`);
    }

    try {
      // Create and bind texture
      const texture = gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create texture');
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Set texture parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Create texture with null data
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        w,
        h,
        0,
        format,
        type,
        null
      );

      // Check for texture creation errors
      const texError = gl.getError();
      if (texError !== gl.NO_ERROR) {
        throw new Error(`Failed to create texture: WebGL error ${texError}`);
      }

      // Create and bind framebuffer
      const fbo = gl.createFramebuffer();
      if (!fbo) {
        gl.deleteTexture(texture);
        throw new Error('Failed to create framebuffer');
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );

      // Check framebuffer status
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(fbo);
        throw new Error(`Framebuffer is incomplete: ${status}`);
      }

      // Clear the framebuffer
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const texelSizeX = 1.0 / w;
      const texelSizeY = 1.0 / h;

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
    } catch (error) {
      console.error('Error creating FBO:', error);
      throw error;
    }
  }

  private initBloomFramebuffers() {
    const res = this.getResolution(this.bloomResolution);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const filtering = this.ext.supportLinearFiltering
      ? this.gl.LINEAR
      : this.gl.NEAREST;

    this._bloom = this.createFBO(
      res.width,
      res.height,
      rgba.internalFormat,
      rgba.format,
      texType,
      filtering,
    );

    this.bloomFramebuffers.length = 0;
    for (let i = 0; i < this.bloomIterations; i++) {
      const width = res.width >> (i + 1);
      const height = res.height >> (i + 1);

      if (width < 2 || height < 2) break;

      const fbo = this.createFBO(
        width,
        height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering,
      );
      this.bloomFramebuffers.push(fbo);
    }
  }

  private initSunraysFramebuffers() {
    const res = this.getResolution(this.sunraysResolution);

    const texType = this.ext.halfFloatTexType;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering
      ? this.gl.LINEAR
      : this.gl.NEAREST;

    this._sunrays = this.createFBO(
      res.width,
      res.height,
      r.internalFormat,
      r.format,
      texType,
      filtering,
    );
    this._sunraysTemp = this.createFBO(
      res.width,
      res.height,
      r.internalFormat,
      r.format,
      texType,
      filtering,
    );
  }

  private blitInit() {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      this.gl.STATIC_DRAW,
    );
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      this.gl.STATIC_DRAW,
    );
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(0);
  }

  private blit(target: FBO | null, clear = false) {
    if (target === null) {
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    } else {
      this.gl.viewport(0, 0, target.width, target.height);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) {
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  }

  public multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      const color = Color.generateColor(this.colorPalette, this.brightness);
      color.r *= 10.0;
      color.g *= 10.0;
      color.b *= 10.0;
      const x = Math.random();
      const y = Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      this.splat(x, y, dx, dy, color);
    }
  }

  public splat(x: number, y: number, dx: number, dy: number, color: RGBColor) {
    this.programs.splatProgram.bind();
    this.gl.uniform1i(
      this.programs.splatProgram.uniforms.uTarget!,
      this._velocity.read.attach(0),
    );
    this.gl.uniform1f(
      this.programs.splatProgram.uniforms.aspectRatio!,
      this.canvas.width / this.canvas.height,
    );
    this.gl.uniform2f(this.programs.splatProgram.uniforms.point!, x, y);
    this.gl.uniform3f(this.programs.splatProgram.uniforms.color!, dx, dy, 0.0);
    this.gl.uniform1f(
      this.programs.splatProgram.uniforms.radius!,
      this.correctRadius(this.splatRadius / 100.0),
    );
    this.blit(this._velocity.write);
    this._velocity.swap();

    this.gl.uniform1i(
      this.programs.splatProgram.uniforms.uTarget!,
      this._dye.read.attach(0),
    );
    this.gl.uniform3f(
      this.programs.splatProgram.uniforms.color!,
      color.r,
      color.g,
      color.b,
    );
    this.blit(this._dye.write);
    this._dye.swap();
  }

  public applyForce(x: number, y: number, dx: number, dy: number, radius: number = 1) {
    const splatRadius = this.correctRadius(radius);
    this.splat(x, y, dx, dy, { r: 0, g: 0, b: 0 });
  }

  private correctRadius(radius: number): number {
    const aspectRatio = this.canvas.width / this.canvas.height;
    if (aspectRatio > 1) {
      radius *= aspectRatio;
    }
    return radius;
  }

  private update = () => {
    if (!this.performanceMonitor) {
      console.warn('Performance monitor not initialized');
      return;
    }

    this.performanceMonitor.startFrame();

    const dt = this.calcDeltaTime();
    if (dt > 0 && !this.paused) {
      this.updateColors(dt);
      this.applyInputs();
      this.step(dt);
    }

    this.render(null);
    
    // Update quality based on performance
    this.performanceMonitor.endFrame();
    const metrics = this.performanceMonitor.getMetrics();
    
    if (this.qualityManager) {
      this.qualityManager.updateMetrics(metrics);
      
      // Apply quality adjustments if needed
      const currentPreset = this.qualityManager.getCurrentPreset();
      this.simResolution = currentPreset.simResolution;
      this.dyeResolution = currentPreset.dyeResolution;
      this.bloomResolution = currentPreset.bloomResolution;
      this.bloomIterations = currentPreset.bloomIterations;
      this.sunrays = currentPreset.sunrays;
      this.sunraysResolution = currentPreset.sunraysResolution;
      this.shading = currentPreset.shading;
    }

    this.animationFrameId = requestAnimationFrame(this.update);
  }

  private calcDeltaTime(): number {
    const now = Date.now();
    let dt = (now - this.lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    this.lastUpdateTime = now;
    return dt;
  }

  private updateColors(dt: number) {
    if (!this.colorful) return;

    this.colorUpdateTimer += dt * this.colorUpdateSpeed;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach((p: Pointer) => {
        p.color = Color.generateColor(this.colorPalette, this.brightness);
      });
    }
  }

  private wrap(value: number, min: number, max: number): number {
    const range: number = max - min;
    if (range == 0) return min;
    return ((value - min) % range) + min;
  }

  private applyInputs() {
    if (this.splatStack.length > 0) {
      this.multipleSplats(this.splatStack.pop()!);
    }
    this.pointers.forEach((p) => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
  }

  private splatPointer(pointer: Pointer) {
    if (this.paused && !this.drawWhilePaused) return;
    const dx = pointer.deltaX * this.splatForce;
    const dy = pointer.deltaY * this.splatForce;
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  private step(dt: number) {
    this.gl.disable(this.gl.BLEND);
    this.gl.viewport(0, 0, this._velocity.width, this._velocity.height);

    this.programs.curlProgram.bind();
    this.gl.uniform2f(
      this.programs.curlProgram.uniforms.texelSize!,
      this._velocity.texelSizeX,
      this._velocity.texelSizeY,
    );
    this.gl.uniform1i(
      this.programs.curlProgram.uniforms.uVelocity!,
      this._velocity.read.attach(0),
    );
    this.blit(this._curl);

    this.programs.vorticityProgram.bind();
    this.gl.uniform2f(
      this.programs.vorticityProgram.uniforms.texelSize!,
      this._velocity.texelSizeX,
      this._velocity.texelSizeY,
    );
    this.gl.uniform1i(
      this.programs.vorticityProgram.uniforms.uVelocity!,
      this._velocity.read.attach(0),
    );
    this.gl.uniform1i(
      this.programs.vorticityProgram.uniforms.uCurl!,
      this._curl.attach(1),
    );
    this.gl.uniform1f(this.programs.vorticityProgram.uniforms.curl!, this.curl);
    this.gl.uniform1f(this.programs.vorticityProgram.uniforms.dt!, dt);
    this.blit(this._velocity.write);
    this._velocity.swap();

    this.programs.divergenceProgram.bind();
    this.gl.uniform2f(
      this.programs.divergenceProgram.uniforms.texelSize!,
      this._velocity.texelSizeX,
      this._velocity.texelSizeY,
    );
    this.gl.uniform1i(
      this.programs.divergenceProgram.uniforms.uVelocity!,
      this._velocity.read.attach(0),
    );
    this.blit(this._divergence);

    this.programs.clearProgram.bind();
    this.gl.uniform1i(
      this.programs.clearProgram.uniforms.uTexture!,
      this._pressure.read.attach(0),
    );
    this.gl.uniform1f(
      this.programs.clearProgram.uniforms.value!,
      this.pressure,
    );
    this.blit(this._pressure.write);
    this._pressure.swap();

    this.programs.pressureProgram.bind();
    this.gl.uniform2f(
      this.programs.pressureProgram.uniforms.texelSize!,
      this._velocity.texelSizeX,
      this._velocity.texelSizeY,
    );
    this.gl.uniform1i(
      this.programs.pressureProgram.uniforms.uDivergence!,
      this._divergence.attach(0),
    );
    for (let i = 0; i < this.pressureIterations; i++) {
      this.gl.uniform1i(
        this.programs.pressureProgram.uniforms.uPressure!,
        this._pressure.read.attach(1),
      );
      this.blit(this._pressure.write);
      this._pressure.swap();
    }

    this.programs.gradienSubtractProgram.bind();
    this.gl.uniform2f(
      this.programs.gradienSubtractProgram.uniforms.texelSize!,
      this._velocity.texelSizeX,
      this._velocity.texelSizeY,
    );
    this.gl.uniform1i(
      this.programs.gradienSubtractProgram.uniforms.uPressure!,
      this._pressure.read.attach(0),
    );
    this.gl.uniform1i(
      this.programs.gradienSubtractProgram.uniforms.uVelocity!,
      this._velocity.read.attach(1),
    );
    this.blit(this._velocity.write);
    this._velocity.swap();

    this.programs.advectionProgram.bind();
    this.gl.uniform2f(
      this.programs.advectionProgram.uniforms.texelSize!,
      this._velocity.texelSizeX,
      this._velocity.texelSizeY,
    );
    if (!this.ext.supportLinearFiltering)
      this.gl.uniform2f(
        this.programs.advectionProgram.uniforms.dyeTexelSize!,
        this._velocity.texelSizeX,
        this._velocity.texelSizeY,
      );
    const velocityId = this._velocity.read.attach(0);
    this.gl.uniform1i(
      this.programs.advectionProgram.uniforms.uVelocity!,
      velocityId,
    );
    this.gl.uniform1i(
      this.programs.advectionProgram.uniforms.uSource!,
      velocityId,
    );
    this.gl.uniform1f(this.programs.advectionProgram.uniforms.dt!, dt);
    this.gl.uniform1f(
      this.programs.advectionProgram.uniforms.dissipation!,
      this.velocityDissipation,
    );
    this.blit(this._velocity.write);
    this._velocity.swap();

    if (!this.ext.supportLinearFiltering)
      this.gl.uniform2f(
        this.programs.advectionProgram.uniforms.dyeTexelSize!,
        this._dye.texelSizeX,
        this._dye.texelSizeY,
      );
    this.gl.uniform1i(
      this.programs.advectionProgram.uniforms.uVelocity!,
      this._velocity.read.attach(0),
    );
    this.gl.uniform1i(
      this.programs.advectionProgram.uniforms.uSource!,
      this._dye.read.attach(1),
    );
    this.gl.uniform1f(
      this.programs.advectionProgram.uniforms.dissipation!,
      this.densityDissipation,
    );
    this.blit(this._dye.write);
    this._dye.swap();
  }

  private render(target: FBO | null) {
    if (target == null) {
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    } else {
      this.gl.viewport(0, 0, target.width, target.height);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
    }

    if (this.bloom) this.applyBloom(this._dye.read, this._bloom);
    if (this.sunrays) {
      this.applySunrays(this._dye.read, this._dye.write, this._sunrays);
      this.blur(this._sunrays, this._sunraysTemp, 1);
    }

    if (target === null || !this.transparent) {
      this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.enable(this.gl.BLEND);
    } else {
      this.gl.disable(this.gl.BLEND);
    }

    if (!this.transparent)
      this.drawColor(target, Color.normalizeColor(Color.HEXtoRGB(this.backgroundColor)));
    this.drawDisplay(target);
  }

  private drawColor(target: FBO | null, color: RGBColor) {
    this.programs.colorProgram.bind();
    this.gl.uniform4f(
      this.programs.colorProgram.uniforms.color!,
      color.r,
      color.g,
      color.b,
      1,
    );
    this.blit(target);
  }

  private drawDisplay(target: FBO | null) {
    const width = target === null ? this.gl.drawingBufferWidth : target.width;
    const height =
      target === null ? this.gl.drawingBufferHeight : target.height;

    this.displayMaterial.bind();
    if (this.shading)
      this.gl.uniform2f(
        this.displayMaterial.uniforms.texelSize!,
        1.0 / width,
        1.0 / height,
      );
    this.gl.uniform1i(
      this.displayMaterial.uniforms.uTexture!,
      this._dye.read.attach(0),
    );
    if (this.bloom) {
      this.gl.uniform1i(
        this.displayMaterial.uniforms.uBloom!,
        this._bloom.attach(1),
      );
      this.gl.uniform1i(
        this.displayMaterial.uniforms.uDithering!,
        this.ditheringTexture.attach(2),
      );
      const scale = Texture.getTextureScale(
        this.ditheringTexture,
        width,
        height,
      );
      this.gl.uniform2f(
        this.displayMaterial.uniforms.ditherScale!,
        scale.x,
        scale.y,
      );
    }
    if (this.sunrays)
      this.gl.uniform1i(
        this.displayMaterial.uniforms.uSunrays!,
        this._sunrays.attach(3),
      );
    this.blit(target);
  }

  private applyBloom(source: FBO, destination: FBO) {
    if (this.bloomFramebuffers.length < 2) return;

    let last = destination;

    this.gl.disable(this.gl.BLEND);
    this.programs.bloomPrefilterProgram.bind();
    const knee = this.bloomThreshold * this.bloomSoftKnee + 0.0001;
    const curve0 = this.bloomThreshold - knee;
    const curve1 = knee * 2;
    const curve2 = 0.25 / knee;
    this.gl.uniform3f(
      this.programs.bloomPrefilterProgram.uniforms.curve!,
      curve0,
      curve1,
      curve2,
    );
    this.gl.uniform1f(
      this.programs.bloomPrefilterProgram.uniforms.threshold!,
      this.bloomThreshold,
    );
    this.gl.uniform1i(
      this.programs.bloomPrefilterProgram.uniforms.uTexture!,
      source.attach(0),
    );
    this.blit(last);

    this.programs.bloomBlurProgram.bind();
    for (const dest of this.bloomFramebuffers) {
      if (!dest) continue;
      this.gl.uniform2f(
        this.programs.bloomBlurProgram.uniforms.texelSize!,
        last.texelSizeX,
        last.texelSizeY,
      );
      this.gl.uniform1i(
        this.programs.bloomBlurProgram.uniforms.uTexture!,
        last.attach(0),
      );
      this.blit(dest);
      last = dest;
    }

    this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
    this.gl.enable(this.gl.BLEND);

    for (let i = this.bloomFramebuffers.length - 2; i >= 0; i--) {
      const baseTex = this.bloomFramebuffers[i]!;
      this.gl.uniform2f(
        this.programs.bloomBlurProgram.uniforms.texelSize!,
        last.texelSizeX,
        last.texelSizeY,
      );
      this.gl.uniform1i(
        this.programs.bloomBlurProgram.uniforms.uTexture!,
        last.attach(0),
      );
      this.gl.viewport(0, 0, baseTex.width, baseTex.height);
      this.blit(baseTex);
      last = baseTex;
    }

    this.gl.disable(this.gl.BLEND);
    this.programs.bloomFinalProgram.bind();
    this.gl.uniform2f(
      this.programs.bloomFinalProgram.uniforms.texelSize!,
      last.texelSizeX,
      last.texelSizeY,
    );
    this.gl.uniform1i(
      this.programs.bloomFinalProgram.uniforms.uTexture!,
      last.attach(0),
    );

    this.gl.uniform1f(
      this.programs.bloomFinalProgram.uniforms.intensity!,
      this.bloomIntensity,
    );
    this.blit(destination);
  }

  private applySunrays(source: FBO, mask: FBO, destination: FBO) {
    this.gl.disable(this.gl.BLEND);
    this.programs.sunraysMaskProgram.bind();
    this.gl.uniform1i(
      this.programs.sunraysMaskProgram.uniforms.uTexture!,
      source.attach(0),
    );
    this.blit(mask);

    this.programs.sunraysProgram.bind();
    this.gl.uniform1f(
      this.programs.sunraysProgram.uniforms.weight!,
      this.sunraysWeight,
    );
    this.gl.uniform1i(
      this.programs.sunraysProgram.uniforms.uTexture!,
      mask.attach(0),
    );
    this.blit(destination);
  }

  private blur(target: FBO, temp: FBO, iterations: number) {
    this.programs.blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
      this.gl.uniform2f(
        this.programs.blurProgram.uniforms.texelSize!,
        target.texelSizeX,
        0.0,
      );
      this.gl.uniform1i(
        this.programs.blurProgram.uniforms.uTexture!,
        target.attach(0),
      );
      this.blit(temp);

      this.gl.uniform2f(
        this.programs.blurProgram.uniforms.texelSize!,
        0.0,
        target.texelSizeY,
      );
      this.gl.uniform1i(
        this.programs.blurProgram.uniforms.uTexture!,
        temp.attach(0),
      );
      this.blit(target);
    }
  }

  public captureScreenshot() {
    const res = this.getResolution(this.captureResolution);
    const target = this.createFBO(
      res.width,
      res.height,
      this.ext.formatRGBA.internalFormat,
      this.ext.formatRGBA.format,
      this.ext.halfFloatTexType,
      this.gl.NEAREST,
    );
    this.render(target);

    const texture = Screenshot.framebufferToTexture(target, this.gl);
    const normalizedTexture = Screenshot.normalizeTexture(
      texture,
      target.width,
      target.height,
    );

    const captureCanvas = Screenshot.textureToCanvas(
      normalizedTexture,
      target.width,
      target.height,
    );

    if (this.inverted) {
      Screenshot.invertImageColors(captureCanvas);
    }

    const datauri = captureCanvas.toDataURL();
    Screenshot.downloadURI('fluid.png', datauri);
    URL.revokeObjectURL(datauri);
  }

  public get inverted(): boolean {
    return this._inverted;
  }
  public set inverted(value: boolean) {
    this._inverted = value;
    this.canvas.style.filter = value ? 'invert(1)' : 'none';
  }

  public addEmitter(emitterConfig: any) {
    return this._emitterManager.addEmitter(emitterConfig);
  }

  public removeEmitter(index: number) {
    this._emitterManager.removeEmitter(index);
  }

  public getEmitter(index: number) {
    return this._emitterManager.getEmitter(index);
  }

  public updateEmitter(index: number, config: any) {
    this._emitterManager.updateEmitter(index, config);
  }

  public get emitters() {
    return this._emitterManager.emitters;
  }

  public setAudioConfig(config: AudioConfig): void {
    if (!this._emitterManager) {
      console.error('EmitterManager not initialized');
      return;
    }

    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support audio input. Using fallback mode.');
      }

      // Add error handling and fallback mode to the config
      const audioConfig: AudioConfig = {
        ...config,
        fallbackMode: true,
        onError: (error: Error) => {
          console.warn('Audio input error:', error);
          if (config.onError) {
            config.onError(error);
          }
          // Switch to fallback mode if available
          if (config.fallbackMode) {
            console.log('Switching to fallback mode');
            this._emitterManager.setFallbackAudioMode(true);
          }
        }
      };

      this._emitterManager.setAudioConfig(audioConfig);
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      // Enable fallback mode
      this._emitterManager.setFallbackAudioMode(true);
    }
  }
}

export { Simulation };
