interface PooledResource {
  resource: WebGLBuffer | WebGLTexture | WebGLFramebuffer;
  lastUsed: number;
  size?: number;
  inUse: boolean;
}

export class ResourceManager {
  private static instance: ResourceManager;
  private gl: WebGL2RenderingContext;
  
  // Resource pools
  private bufferPool: Map<string, PooledResource[]> = new Map();
  private texturePool: Map<string, PooledResource[]> = new Map();
  private framebufferPool: Map<string, PooledResource[]> = new Map();
  
  // Resource tracking
  private activeResources: Set<WebGLBuffer | WebGLTexture | WebGLFramebuffer> = new Set();
  private resourceSizes: Map<WebGLBuffer | WebGLTexture | WebGLFramebuffer, number> = new Map();
  
  // Pool configuration
  private readonly MAX_POOL_SIZE = 32;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly RESOURCE_TTL = 60000; // 1 minute

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.startCleanupInterval();
  }

  public static getInstance(gl: WebGL2RenderingContext): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager(gl);
    }
    return ResourceManager.instance;
  }

  private startCleanupInterval(): void {
    setInterval(() => this.cleanupUnusedResources(), this.CLEANUP_INTERVAL);
  }

  public createBuffer(size: number, usage: number): WebGLBuffer {
    const key = `${size}-${usage}`;
    const pooled = this.getFromPool(this.bufferPool, key);
    
    if (pooled) {
      return pooled.resource as WebGLBuffer;
    }

    const buffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, size, usage);
    
    this.trackResource(buffer, size);
    return buffer;
  }

  private getOptimalTextureFormat(): {internalFormat: number, format: number, type: number} {
    // Check for floating point texture support
    const ext = {
        floatTexture: this.gl.getExtension('OES_texture_float'),
        halfFloatTexture: this.gl.getExtension('OES_texture_half_float'),
        floatLinear: this.gl.getExtension('OES_texture_float_linear'),
        halfFloatLinear: this.gl.getExtension('OES_texture_half_float_linear')
    };

    // Test formats in order of preference
    const formats = [
        {
            internalFormat: this.gl.RGBA16F,
            format: this.gl.RGBA,
            type: this.gl.HALF_FLOAT
        },
        {
            internalFormat: this.gl.RGBA32F,
            format: this.gl.RGBA,
            type: this.gl.FLOAT
        },
        {
            internalFormat: this.gl.RGBA8,
            format: this.gl.RGBA,
            type: this.gl.UNSIGNED_BYTE
        }
    ];

    for (const format of formats) {
        if (this.isFormatSupported(format.internalFormat, format.format, format.type)) {
            return format;
        }
    }

    // Default fallback
    return {
        internalFormat: this.gl.RGBA8,
        format: this.gl.RGBA,
        type: this.gl.UNSIGNED_BYTE
    };
  }

  public createTexture(
    width: number,
    height: number,
    requestedFormat: number,
    requestedType: number,
  ): WebGLTexture {
    // Create and bind texture
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture object');
    }

    // Bind the texture before setting parameters
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // Set texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Handle format conversion for WebGL 1 and 2
    const isWebGL2 = this.gl instanceof WebGL2RenderingContext;
    let internalFormat = requestedFormat;
    let format = requestedFormat;
    let type = requestedType;

    if (!isWebGL2) {
      // For WebGL 1, we need to adjust formats
      switch (requestedFormat) {
        case this.gl.RGBA16F:
        case this.gl.RG16F:
        case this.gl.R16F:
          internalFormat = this.gl.RGBA;
          format = this.gl.RGBA;
          break;
        default:
          internalFormat = this.gl.RGBA;
          format = this.gl.RGBA;
      }
    } else {
      // For WebGL 2, ensure format compatibility
      switch (requestedFormat) {
        case this.gl.RGBA16F:
          format = this.gl.RGBA;
          break;
        case this.gl.RG16F:
          format = this.gl.RG;
          break;
        case this.gl.R16F:
          format = this.gl.RED;
          break;
      }
    }

    try {
      // Create the texture with the selected format
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        internalFormat,
        width,
        height,
        0,
        format,
        type,
        null
      );

      // Check for errors
      const error = this.gl.getError();
      if (error !== this.gl.NO_ERROR) {
        // If floating point texture failed, fall back to RGBA8
        if (isWebGL2 && (type === this.gl.FLOAT || type === this.gl.HALF_FLOAT)) {
          console.warn('Floating point texture not supported, falling back to RGBA8');
          internalFormat = this.gl.RGBA8;
          format = this.gl.RGBA;
          type = this.gl.UNSIGNED_BYTE;

          // Try again with fallback format
          this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            internalFormat,
            width,
            height,
            0,
            format,
            type,
            null
          );

          const fallbackError = this.gl.getError();
          if (fallbackError !== this.gl.NO_ERROR) {
            throw new Error(`Failed to create texture with fallback format: WebGL error ${fallbackError}`);
          }
        } else {
          throw new Error(`Failed to create texture: WebGL error ${error}`);
        }
      }

      // Track the resource
      const size = width * height * this.getBytesPerPixel(format, type);
      this.trackResource(texture, size);

      return texture;
    } catch (e) {
      // Clean up on error
      if (texture) {
        this.gl.deleteTexture(texture);
      }
      throw e;
    }
  }

  private isFormatSupported(internalFormat: number, format: number, type: number): boolean {
    try {
      // Create a small test texture
      const testTexture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, testTexture);
      
      // Try to allocate with the given format
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        internalFormat,
        1,
        1,
        0,
        format,
        type,
        null
      );
      
      const error = this.gl.getError();
      
      // Cleanup
      this.gl.deleteTexture(testTexture);
      
      return error === this.gl.NO_ERROR;
    } catch (e) {
      return false;
    }
  }

  public createFramebuffer(
    width: number,
    height: number,
    format: number,
    type: number,
  ): WebGLFramebuffer {
    // Create framebuffer
    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create framebuffer');
    }

    // Create and attach texture
    let texture: WebGLTexture;
    try {
      texture = this.createTexture(width, height, format, type);
    } catch (error) {
      this.gl.deleteFramebuffer(framebuffer);
      throw error;
    }

    // Bind framebuffer and attach texture
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );

    // Check framebuffer status
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      this.gl.deleteTexture(texture);
      this.gl.deleteFramebuffer(framebuffer);
      throw new Error(`Framebuffer is incomplete: ${status}`);
    }

    // Clear the framebuffer
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Track resource
    const size = width * height * this.getBytesPerPixel(format, type);
    this.trackResource(framebuffer, size);

    return framebuffer;
  }

  public releaseResource(
    resource: WebGLBuffer | WebGLTexture | WebGLFramebuffer,
    type: 'buffer' | 'texture' | 'framebuffer',
  ): void {
    if (!this.activeResources.has(resource)) {
      return;
    }

    const size = this.resourceSizes.get(resource);
    if (!size) {
      return;
    }

    const pool = this.getPoolForType(type);
    const key = this.getResourceKey(resource, type);
    
    if (!pool.has(key)) {
      pool.set(key, []);
    }

    const poolArray = pool.get(key)!;
    if (poolArray.length < this.MAX_POOL_SIZE) {
      poolArray.push({
        resource,
        lastUsed: Date.now(),
        size,
        inUse: false,
      });
    } else {
      this.deleteResource(resource, type);
    }

    this.activeResources.delete(resource);
    this.resourceSizes.delete(resource);
  }

  private getFromPool(
    pool: Map<string, PooledResource[]>,
    key: string,
  ): PooledResource | null {
    const resources = pool.get(key);
    if (!resources || resources.length === 0) {
      return null;
    }

    const resource = resources.find((r) => !r.inUse);
    if (resource) {
      resource.inUse = true;
      resource.lastUsed = Date.now();
      return resource;
    }

    return null;
  }

  private cleanupUnusedResources(): void {
    const now = Date.now();

    this.cleanupPool(this.bufferPool, 'buffer', now);
    this.cleanupPool(this.texturePool, 'texture', now);
    this.cleanupPool(this.framebufferPool, 'framebuffer', now);
  }

  private cleanupPool(
    pool: Map<string, PooledResource[]>,
    type: 'buffer' | 'texture' | 'framebuffer',
    now: number,
  ): void {
    for (const [key, resources] of pool.entries()) {
      const validResources = resources.filter((resource) => {
        if (!resource.inUse && now - resource.lastUsed > this.RESOURCE_TTL) {
          this.deleteResource(resource.resource, type);
          return false;
        }
        return true;
      });

      if (validResources.length === 0) {
        pool.delete(key);
      } else {
        pool.set(key, validResources);
      }
    }
  }

  private deleteResource(
    resource: WebGLBuffer | WebGLTexture | WebGLFramebuffer,
    type: 'buffer' | 'texture' | 'framebuffer',
  ): void {
    switch (type) {
      case 'buffer':
        this.gl.deleteBuffer(resource as WebGLBuffer);
        break;
      case 'texture':
        this.gl.deleteTexture(resource as WebGLTexture);
        break;
      case 'framebuffer':
        this.gl.deleteFramebuffer(resource as WebGLFramebuffer);
        break;
    }
  }

  private trackResource(
    resource: WebGLBuffer | WebGLTexture | WebGLFramebuffer,
    size: number,
  ): void {
    this.activeResources.add(resource);
    this.resourceSizes.set(resource, size);
  }

  private getPoolForType(type: 'buffer' | 'texture' | 'framebuffer'): Map<string, PooledResource[]> {
    switch (type) {
      case 'buffer':
        return this.bufferPool;
      case 'texture':
        return this.texturePool;
      case 'framebuffer':
        return this.framebufferPool;
    }
  }

  private getResourceKey(
    resource: WebGLBuffer | WebGLTexture | WebGLFramebuffer,
    type: 'buffer' | 'texture' | 'framebuffer',
  ): string {
    const size = this.resourceSizes.get(resource);
    return `${type}-${size}`;
  }

  private getBytesPerPixel(format: number, type: number): number {
    let components;
    switch (format) {
      case this.gl.RGBA:
      case this.gl.RGBA8:
      case this.gl.RGBA16F:
      case this.gl.RGBA32F:
        components = 4;
        break;
      case this.gl.RGB:
      case this.gl.RGB8:
      case this.gl.RGB16F:
      case this.gl.RGB32F:
        components = 3;
        break;
      case this.gl.RG:
      case this.gl.RG8:
      case this.gl.RG16F:
      case this.gl.RG32F:
        components = 2;
        break;
      case this.gl.RED:
      case this.gl.R8:
      case this.gl.R16F:
      case this.gl.R32F:
        components = 1;
        break;
      default:
        components = 4;
    }

    let bytesPerComponent;
    switch (type) {
      case this.gl.FLOAT:
        bytesPerComponent = 4;
        break;
      case this.gl.HALF_FLOAT:
        bytesPerComponent = 2;
        break;
      case this.gl.UNSIGNED_BYTE:
        bytesPerComponent = 1;
        break;
      default:
        bytesPerComponent = 1;
    }

    return components * bytesPerComponent;
  }

  public getResourceStats(): {
    activeResources: number;
    pooledResources: number;
    totalMemoryUsage: number;
  } {
    let pooledResources = 0;
    let totalMemoryUsage = 0;

    // Count pooled resources
    for (const resources of this.bufferPool.values()) {
      pooledResources += resources.length;
    }
    for (const resources of this.texturePool.values()) {
      pooledResources += resources.length;
    }
    for (const resources of this.framebufferPool.values()) {
      pooledResources += resources.length;
    }

    // Calculate memory usage
    for (const [resource, size] of this.resourceSizes) {
      totalMemoryUsage += size;
    }

    return {
      activeResources: this.activeResources.size,
      pooledResources,
      totalMemoryUsage,
    };
  }

  private getFormatName(format: number): string {
    const formats: Record<number, string> = {
        [this.gl.RGBA]: 'RGBA',
        [this.gl.RGBA8]: 'RGBA8',
        [this.gl.RGBA16F]: 'RGBA16F',
        [this.gl.RGBA32F]: 'RGBA32F'
    };
    return formats[format] || 'Unknown';
  }
} 