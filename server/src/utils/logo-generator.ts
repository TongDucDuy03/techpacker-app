// Dynamic logo generation utilities for PDF

export interface LogoConfig {
  companyName: string;
  brandColor?: string;
  logoType?: 'text' | 'icon' | 'combined';
  size?: { width: number; height: number };
}

export class LogoGenerator {
  /**
   * Generate SVG logo based on company configuration
   */
  static generateSVGLogo(config: LogoConfig): string {
    const {
      companyName,
      brandColor = '#1e3a8a',
      logoType = 'text',
      size = { width: 120, height: 60 }
    } = config;

    const { width, height } = size;

    switch (logoType) {
      case 'text':
        return this.generateTextLogo(companyName, brandColor, width, height);
      case 'icon':
        return this.generateIconLogo(companyName, brandColor, width, height);
      case 'combined':
        return this.generateCombinedLogo(companyName, brandColor, width, height);
      default:
        return this.generateTextLogo(companyName, brandColor, width, height);
    }
  }

  /**
   * Generate text-only logo
   */
  private static generateTextLogo(name: string, color: string, width: number, height: number): string {
    const fontSize = Math.min(width / name.length * 1.2, height * 0.4);
    
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="${color}" stroke-width="1" rx="4"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
              font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">
          ${name}
        </text>
      </svg>
    `;
  }

  /**
   * Generate icon-based logo
   */
  private static generateIconLogo(_name: string, color: string, width: number, height: number): string {
    const iconSize = Math.min(width, height) * 0.6;
    const centerX = width / 2;
    const centerY = height / 2;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="${color}" stroke-width="1" rx="4"/>
        <g transform="translate(${centerX - iconSize/2}, ${centerY - iconSize/2})">
          <rect width="${iconSize}" height="${iconSize * 0.7}" fill="${color}" rx="2"/>
          <rect x="${iconSize * 0.1}" y="${iconSize * 0.1}" width="${iconSize * 0.8}" height="${iconSize * 0.1}" fill="white"/>
          <rect x="${iconSize * 0.1}" y="${iconSize * 0.25}" width="${iconSize * 0.8}" height="${iconSize * 0.05}" fill="white"/>
          <rect x="${iconSize * 0.1}" y="${iconSize * 0.35}" width="${iconSize * 0.8}" height="${iconSize * 0.05}" fill="white"/>
          <rect x="${iconSize * 0.1}" y="${iconSize * 0.45}" width="${iconSize * 0.8}" height="${iconSize * 0.05}" fill="white"/>
        </g>
      </svg>
    `;
  }

  /**
   * Generate combined text + icon logo
   */
  private static generateCombinedLogo(name: string, color: string, width: number, height: number): string {
    const iconSize = height * 0.6;
    const textX = iconSize + 10;
    const fontSize = Math.min((width - textX) / name.length * 1.2, height * 0.3);

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" stroke="${color}" stroke-width="1" rx="4"/>
        
        <!-- Icon -->
        <g transform="translate(5, ${(height - iconSize) / 2})">
          <rect width="${iconSize}" height="${iconSize}" fill="${color}" rx="3"/>
          <rect x="${iconSize * 0.15}" y="${iconSize * 0.15}" width="${iconSize * 0.7}" height="${iconSize * 0.15}" fill="white"/>
          <rect x="${iconSize * 0.15}" y="${iconSize * 0.35}" width="${iconSize * 0.7}" height="${iconSize * 0.08}" fill="white"/>
          <rect x="${iconSize * 0.15}" y="${iconSize * 0.48}" width="${iconSize * 0.7}" height="${iconSize * 0.08}" fill="white"/>
          <rect x="${iconSize * 0.15}" y="${iconSize * 0.61}" width="${iconSize * 0.7}" height="${iconSize * 0.08}" fill="white"/>
        </g>
        
        <!-- Text -->
        <text x="${textX}" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
              font-weight="bold" fill="${color}" dominant-baseline="middle">
          ${name}
        </text>
      </svg>
    `;
  }

  /**
   * Convert SVG to base64 data URL
   */
  static svgToDataUrl(svg: string): string {
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Get logo for supplier/brand
   */
  static getLogoForSupplier(supplierName: string): string {
    const logoConfigs: { [key: string]: LogoConfig } = {
      'LS Apparel': {
        companyName: 'LS Apparel',
        brandColor: '#2563eb',
        logoType: 'combined'
      },
      'Fashion Co': {
        companyName: 'Fashion Co',
        brandColor: '#dc2626',
        logoType: 'text'
      },
      'Textile Mills': {
        companyName: 'Textile Mills',
        brandColor: '#059669',
        logoType: 'icon'
      },
      'Global Sourcing': {
        companyName: 'Global Sourcing',
        brandColor: '#7c3aed',
        logoType: 'combined'
      }
    };

    const config = logoConfigs[supplierName] || {
      companyName: supplierName,
      brandColor: '#1e3a8a',
      logoType: 'text'
    };

    const svg = this.generateSVGLogo(config);
    return this.svgToDataUrl(svg);
  }
}

export default LogoGenerator;
