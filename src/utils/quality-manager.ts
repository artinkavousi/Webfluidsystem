import { defaultConfig } from '../config';
import type { PerformanceMetrics } from './performance';

export interface QualityPreset {
  name: string;
  simResolution: number;
  dyeResolution: number;
  bloomResolution: number;
  bloomIterations: number;
  sunrays: boolean;
  sunraysResolution: number;
  shading: boolean;
}

export class QualityManager {
  private static instance: QualityManager;
  
  private readonly TARGET_FPS = 60;
  private readonly FPS_SAMPLE_PERIOD = 1000; // 1 second
  private readonly QUALITY_CHECK_INTERVAL = 5000; // 5 seconds
  
  private currentPreset: QualityPreset;
  private fpsHistory: number[] = [];
  private lastQualityCheck = 0;
  private isAutoQuality = true;

  private readonly presets: QualityPreset[] = [
    {
      name: 'Ultra',
      simResolution: defaultConfig.simResolution,
      dyeResolution: defaultConfig.dyeResolution,
      bloomResolution: defaultConfig.bloomResolution,
      bloomIterations: defaultConfig.bloomIterations,
      sunrays: true,
      sunraysResolution: defaultConfig.sunraysResolution,
      shading: true,
    },
    {
      name: 'High',
      simResolution: defaultConfig.simResolution * 0.8,
      dyeResolution: defaultConfig.dyeResolution * 0.8,
      bloomResolution: defaultConfig.bloomResolution * 0.8,
      bloomIterations: defaultConfig.bloomIterations - 1,
      sunrays: true,
      sunraysResolution: defaultConfig.sunraysResolution * 0.8,
      shading: true,
    },
    {
      name: 'Medium',
      simResolution: defaultConfig.simResolution * 0.6,
      dyeResolution: defaultConfig.dyeResolution * 0.6,
      bloomResolution: defaultConfig.bloomResolution * 0.6,
      bloomIterations: Math.max(defaultConfig.bloomIterations - 2, 2),
      sunrays: true,
      sunraysResolution: defaultConfig.sunraysResolution * 0.6,
      shading: true,
    },
    {
      name: 'Low',
      simResolution: defaultConfig.simResolution * 0.4,
      dyeResolution: defaultConfig.dyeResolution * 0.4,
      bloomResolution: defaultConfig.bloomResolution * 0.4,
      bloomIterations: 2,
      sunrays: false,
      sunraysResolution: defaultConfig.sunraysResolution * 0.4,
      shading: false,
    },
  ];

  private constructor() {
    this.currentPreset = { ...this.presets[0] }; // Start with Ultra preset
  }

  public static getInstance(): QualityManager {
    if (!QualityManager.instance) {
      QualityManager.instance = new QualityManager();
    }
    return QualityManager.instance;
  }

  public updateMetrics(metrics: PerformanceMetrics): void {
    if (!this.isAutoQuality) {
      return;
    }

    this.fpsHistory.push(metrics.fps);
    
    // Keep only last second of FPS samples
    const now = performance.now();
    while (
      this.fpsHistory.length > 0 &&
      now - this.lastQualityCheck > this.FPS_SAMPLE_PERIOD
    ) {
      this.fpsHistory.shift();
    }

    // Check if we need to adjust quality
    if (now - this.lastQualityCheck >= this.QUALITY_CHECK_INTERVAL) {
      this.adjustQuality();
      this.lastQualityCheck = now;
    }
  }

  private adjustQuality(): void {
    if (this.fpsHistory.length === 0) {
      return;
    }

    const avgFps =
      this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    
    // Find current preset index
    const currentIndex = this.presets.findIndex(
      (preset) => preset.name === this.currentPreset.name,
    );
    
    if (avgFps < this.TARGET_FPS * 0.8 && currentIndex < this.presets.length - 1) {
      // Performance is poor, decrease quality
      this.setPreset(this.presets[currentIndex + 1]);
    } else if (
      avgFps > this.TARGET_FPS * 0.95 &&
      currentIndex > 0 &&
      this.fpsHistory.every((fps) => fps > this.TARGET_FPS * 0.9)
    ) {
      // Performance is good and stable, try increasing quality
      this.setPreset(this.presets[currentIndex - 1]);
    }
  }

  public setPreset(preset: QualityPreset): void {
    const oldPreset = { ...this.currentPreset };
    this.currentPreset = { ...preset };

    // Notify about quality changes if they occurred
    if (JSON.stringify(oldPreset) !== JSON.stringify(this.currentPreset)) {
      console.log(`Quality changed to ${preset.name}`);
      this.fpsHistory = []; // Reset FPS history after quality change
    }
  }

  public setAutoQuality(enabled: boolean): void {
    this.isAutoQuality = enabled;
    if (enabled) {
      this.fpsHistory = []; // Reset FPS history when enabling auto quality
      this.lastQualityCheck = performance.now();
    }
  }

  public getCurrentPreset(): QualityPreset {
    return { ...this.currentPreset };
  }

  public getPresets(): QualityPreset[] {
    return this.presets.map((preset) => ({ ...preset }));
  }

  public getQualityStats(): {
    currentPreset: string;
    averageFps: number;
    isAutoQuality: boolean;
    targetFps: number;
  } {
    const avgFps =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) /
          this.fpsHistory.length
        : 0;

    return {
      currentPreset: this.currentPreset.name,
      averageFps: avgFps,
      isAutoQuality: this.isAutoQuality,
      targetFps: this.TARGET_FPS,
    };
  }
} 