import { defaultConfig } from '../config';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  gpuMemory: number | null;
  drawCalls: number;
  triangles: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    gpuMemory: null,
    drawCalls: 0,
    triangles: 0,
  };

  private frameCount = 0;
  private lastTime = performance.now();
  private fpsUpdateInterval = 1000; // Update FPS every second
  private gl: WebGL2RenderingContext;
  private ext: any;

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ext = gl.getExtension('WEBGL_debug_renderer_info');
  }

  public static getInstance(gl: WebGL2RenderingContext): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(gl);
    }
    return PerformanceMonitor.instance;
  }

  public startFrame(): void {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= this.fpsUpdateInterval) {
      this.metrics.fps = (this.frameCount * 1000) / (currentTime - this.lastTime);
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    // Reset per-frame counters
    this.metrics.drawCalls = 0;
    this.metrics.triangles = 0;
  }

  public endFrame(): void {
    const currentTime = performance.now();
    this.metrics.frameTime = currentTime - this.lastTime;
  }

  public recordDrawCall(triangleCount: number): void {
    this.metrics.drawCalls++;
    this.metrics.triangles += triangleCount;
  }

  public getMetrics(): PerformanceMetrics {
    let gpuMemory = null;

    try {
      // Only try to get renderer info if the extension is available
      const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        // Get renderer string which might contain memory info
        const renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer) {
          // Try to parse memory info from renderer string
          const memMatch = renderer.match(/(\d+)MB/);
          if (memMatch) {
            gpuMemory = parseInt(memMatch[1]) * 1024 * 1024;
          }
        }
      }
    } catch (e) {
      console.warn('Unable to get GPU info:', e);
    }

    return {
      fps: this.metrics.fps,
      frameTime: this.metrics.frameTime,
      gpuMemory,
      drawCalls: this.metrics.drawCalls,
      triangles: this.metrics.triangles,
    };
  }

  public suggestQualityAdjustments(): { [key: string]: any } {
    const adjustments: { [key: string]: any } = {};
    
    // If FPS is too low, suggest quality reductions
    if (this.metrics.fps < 30) {
      if (defaultConfig.simResolution > 128) {
        adjustments.simResolution = Math.max(128, defaultConfig.simResolution / 2);
      }
      if (defaultConfig.bloomIterations > 4) {
        adjustments.bloomIterations = 4;
      }
      if (defaultConfig.sunrays) {
        adjustments.sunrays = false;
      }
    }
    
    // If GPU memory usage is high, suggest memory optimizations
    if (this.metrics.gpuMemory !== null && this.metrics.gpuMemory < 100 * 1024 * 1024) { // Less than 100MB free
      adjustments.dyeResolution = Math.max(512, defaultConfig.dyeResolution / 2);
      adjustments.bloomResolution = Math.max(128, defaultConfig.bloomResolution / 2);
    }

    return adjustments;
  }

  public static formatMemorySize(bytes: number | null): string {
    if (bytes === null) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
} 