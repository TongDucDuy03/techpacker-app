// Watermark utilities for PDF generation

export interface WatermarkOptions {
  text: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  color: string;
  position: 'center' | 'diagonal' | 'corner' | 'repeat';
  fontFamily?: string;
}

export class WatermarkGenerator {
  /**
   * Generate CSS for watermark overlay
   */
  static generateWatermarkCSS(options: WatermarkOptions): string {
    const {
      text,
      opacity = 0.1,
      rotation = -45,
      fontSize = 60,
      color = '#000000',
      position = 'diagonal',
      fontFamily = 'Arial, sans-serif'
    } = options;

    switch (position) {
      case 'center':
        return this.generateCenterWatermark(text, opacity, rotation, fontSize, color, fontFamily);
      case 'diagonal':
        return this.generateDiagonalWatermark(text, opacity, rotation, fontSize, color, fontFamily);
      case 'corner':
        return this.generateCornerWatermark(text, opacity, fontSize, color, fontFamily);
      case 'repeat':
        return this.generateRepeatingWatermark(text, opacity, rotation, fontSize, color, fontFamily);
      default:
        return this.generateDiagonalWatermark(text, opacity, rotation, fontSize, color, fontFamily);
    }
  }

  /**
   * Center watermark
   */
  private static generateCenterWatermark(
    text: string, opacity: number, rotation: number, 
    fontSize: number, color: string, fontFamily: string
  ): string {
    return `
      body::before {
        content: "${text}";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(${rotation}deg);
        font-size: ${fontSize}px;
        font-family: ${fontFamily};
        font-weight: bold;
        color: ${color};
        opacity: ${opacity};
        z-index: -1;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      }
    `;
  }

  /**
   * Diagonal repeating watermark
   */
  private static generateDiagonalWatermark(
    text: string, opacity: number, rotation: number,
    fontSize: number, color: string, fontFamily: string
  ): string {
    return `
      body::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
          repeating-linear-gradient(
            ${rotation}deg,
            transparent,
            transparent 100px,
            ${color} 100px,
            ${color} 101px
          );
        opacity: ${opacity * 0.3};
        z-index: -2;
        pointer-events: none;
      }
      
      body::after {
        content: "${text}";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(${rotation}deg);
        font-size: ${fontSize}px;
        font-family: ${fontFamily};
        font-weight: bold;
        color: ${color};
        opacity: ${opacity};
        z-index: -1;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      }
    `;
  }

  /**
   * Corner watermark
   */
  private static generateCornerWatermark(
    text: string, opacity: number, fontSize: number, 
    color: string, fontFamily: string
  ): string {
    return `
      body::before {
        content: "${text}";
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-size: ${fontSize * 0.5}px;
        font-family: ${fontFamily};
        font-weight: bold;
        color: ${color};
        opacity: ${opacity};
        z-index: -1;
        pointer-events: none;
        user-select: none;
      }
    `;
  }

  /**
   * Repeating pattern watermark
   */
  private static generateRepeatingWatermark(
    text: string, opacity: number, rotation: number,
    fontSize: number, color: string, fontFamily: string
  ): string {
    const spacing = fontSize * 3;
    return `
      body::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url("data:image/svg+xml,${encodeURIComponent(`
          <svg width="${spacing}" height="${spacing}" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" font-family="${fontFamily}" font-size="${fontSize * 0.3}" 
                  font-weight="bold" fill="${color}" opacity="${opacity}" 
                  text-anchor="middle" dominant-baseline="middle"
                  transform="rotate(${rotation} ${spacing/2} ${spacing/2})">
              ${text}
            </text>
          </svg>
        `)}");
        background-repeat: repeat;
        z-index: -1;
        pointer-events: none;
      }
    `;
  }

  /**
   * Get predefined watermark configurations
   */
  static getPredefinedWatermarks(): { [key: string]: WatermarkOptions } {
    return {
      confidential: {
        text: 'CONFIDENTIAL',
        opacity: 0.1,
        rotation: -45,
        fontSize: 80,
        color: '#dc2626',
        position: 'diagonal'
      },
      draft: {
        text: 'DRAFT',
        opacity: 0.15,
        rotation: -30,
        fontSize: 100,
        color: '#f59e0b',
        position: 'center'
      },
      sample: {
        text: 'SAMPLE',
        opacity: 0.08,
        rotation: 45,
        fontSize: 60,
        color: '#059669',
        position: 'repeat'
      },
      internal: {
        text: 'INTERNAL USE ONLY',
        opacity: 0.12,
        rotation: 0,
        fontSize: 40,
        color: '#6366f1',
        position: 'corner'
      },
      approved: {
        text: 'APPROVED',
        opacity: 0.1,
        rotation: -45,
        fontSize: 70,
        color: '#16a34a',
        position: 'diagonal'
      },
      revision: {
        text: 'UNDER REVISION',
        opacity: 0.15,
        rotation: -30,
        fontSize: 50,
        color: '#ea580c',
        position: 'center'
      }
    };
  }

  /**
   * Generate watermark based on lifecycle stage
   */
  static getWatermarkForLifecycleStage(stage: string): WatermarkOptions | null {
    const predefined = this.getPredefinedWatermarks();
    
    switch (stage.toLowerCase()) {
      case 'concept':
      case 'development':
        return predefined.draft;
      case 'sampling':
        return predefined.sample;
      case 'production':
        return predefined.approved;
      case 'revision':
        return predefined.revision;
      default:
        return null;
    }
  }

  /**
   * Generate custom watermark for brand/supplier
   */
  static generateBrandWatermark(brandName: string, supplierName?: string): WatermarkOptions {
    const text = supplierName ? `${brandName} - ${supplierName}` : brandName;
    
    return {
      text: text.toUpperCase(),
      opacity: 0.05,
      rotation: -45,
      fontSize: Math.max(30, Math.min(60, 300 / text.length)),
      color: '#64748b',
      position: 'repeat'
    };
  }
}

export default WatermarkGenerator;
