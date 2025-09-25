import { TechPack, BOMItem, POMSpecification, ConstructionDetail, CareInstruction } from '../types';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'completeness' | 'consistency' | 'business' | 'compliance';
  severity: 'error' | 'warning' | 'info';
  modules: string[];
  validate: (techPack: TechPack) => ValidationResult;
  fix?: (techPack: TechPack) => Partial<TechPack>;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: any;
  suggestions?: string[];
  affectedModules?: string[];
}

export interface ValidationReport {
  techPackId: string;
  timestamp: Date;
  overall: {
    isValid: boolean;
    score: number; // 0-100
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  moduleScores: {
    bom: number;
    measurement: number;
    construction: number;
    care: number;
  };
  results: ValidationResult[];
  recommendations: string[];
}

class ValidationEngine {
  private rules: ValidationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // Completeness Rules
    this.addRule({
      id: 'techpack-basic-info',
      name: 'Basic Information Completeness',
      description: 'TechPack must have all basic information filled',
      category: 'completeness',
      severity: 'error',
      modules: ['techpack'],
      validate: (techPack: TechPack) => {
        const requiredFields = ['name', 'category', 'status', 'season', 'brand', 'designer'];
        const missingFields = requiredFields.filter(field => !techPack[field as keyof TechPack]);
        
        return {
          isValid: missingFields.length === 0,
          message: missingFields.length > 0 
            ? `Missing required fields: ${missingFields.join(', ')}`
            : 'All basic information is complete',
          details: { missingFields },
          suggestions: missingFields.map(field => `Fill in the ${field} field`)
        };
      }
    });

    this.addRule({
      id: 'bom-completeness',
      name: 'BOM Completeness',
      description: 'BOM must have at least one item with all required fields',
      category: 'completeness',
      severity: 'error',
      modules: ['bom'],
      validate: (techPack: TechPack) => {
        const bomItems = techPack.bomItems || [];
        
        if (bomItems.length === 0) {
          return {
            isValid: false,
            message: 'BOM is empty',
            suggestions: ['Add at least one BOM item']
          };
        }

        const requiredFields = ['part', 'material_code', 'quantity', 'uom', 'supplier'];
        const incompleteItems = bomItems.filter(item => 
          requiredFields.some(field => !item[field as keyof BOMItem])
        );

        return {
          isValid: incompleteItems.length === 0,
          message: incompleteItems.length > 0 
            ? `${incompleteItems.length} BOM items are incomplete`
            : 'All BOM items are complete',
          details: { incompleteItems: incompleteItems.length },
          suggestions: incompleteItems.length > 0 
            ? ['Complete all required fields for BOM items']
            : []
        };
      }
    });

    this.addRule({
      id: 'measurement-completeness',
      name: 'Measurement Completeness',
      description: 'At least one measurement specification is required',
      category: 'completeness',
      severity: 'error',
      modules: ['measurement'],
      validate: (techPack: TechPack) => {
        const measurements = techPack.measurements || [];
        
        if (measurements.length === 0) {
          return {
            isValid: false,
            message: 'No measurement specifications found',
            suggestions: ['Add measurement specifications for all sizes']
          };
        }

        const requiredFields = ['pom_code', 'pom_name', 'tolerances', 'measurements'];
        const incompleteMeasurements = measurements.filter(measurement => 
          requiredFields.some(field => !measurement[field as keyof POMSpecification])
        );

        return {
          isValid: incompleteMeasurements.length === 0,
          message: incompleteMeasurements.length > 0 
            ? `${incompleteMeasurements.length} measurement specifications are incomplete`
            : 'All measurement specifications are complete',
          details: { incompleteMeasurements: incompleteMeasurements.length }
        };
      }
    });

    // Consistency Rules
    this.addRule({
      id: 'bom-measurement-consistency',
      name: 'BOM-Measurement Consistency',
      description: 'BOM placements should have corresponding measurements',
      category: 'consistency',
      severity: 'warning',
      modules: ['bom', 'measurement'],
      validate: (techPack: TechPack) => {
        const bomItems = techPack.bomItems || [];
        const measurements = techPack.measurements || [];
        
        const bomPlacements = new Set(bomItems.map(item => item.placement));
        const measurementCategories = new Set(measurements.map(measurement => measurement.category));
        
        const missingMeasurements = Array.from(bomPlacements).filter(placement => 
          !measurementCategories.has(placement)
        );

        return {
          isValid: missingMeasurements.length === 0,
          message: missingMeasurements.length > 0 
            ? `Missing measurements for BOM placements: ${missingMeasurements.join(', ')}`
            : 'BOM and measurements are consistent',
          details: { missingMeasurements },
          suggestions: missingMeasurements.map(placement => 
            `Add measurement specifications for ${placement} placement`
          )
        };
      }
    });

    this.addRule({
      id: 'measurement-unit-consistency',
      name: 'Measurement Unit Consistency',
      description: 'All measurements should use the same unit',
      category: 'consistency',
      severity: 'warning',
      modules: ['measurement'],
      validate: (techPack: TechPack) => {
        const measurements = techPack.measurements || [];
        const units = new Set(measurements.map(measurement => measurement.unit));
        
        return {
          isValid: units.size <= 1,
          message: units.size > 1 
            ? `Mixed measurement units detected: ${Array.from(units).join(', ')}`
            : 'All measurements use consistent units',
          details: { units: Array.from(units) },
          suggestions: units.size > 1 
            ? ['Standardize all measurements to use the same unit']
            : []
        };
      }
    });

    this.addRule({
      id: 'construction-sequence-consistency',
      name: 'Construction Sequence Consistency',
      description: 'Construction details should have sequential order numbers',
      category: 'consistency',
      severity: 'error',
      modules: ['construction'],
      validate: (techPack: TechPack) => {
        const constructionDetails = techPack.constructionDetails || [];
        const sequences = constructionDetails.map(detail => detail.sequence).sort((a, b) => a - b);
        const expectedSequences = Array.from({ length: sequences.length }, (_, i) => i + 1);
        
        const missingSequences = expectedSequences.filter(seq => !sequences.includes(seq));
        const duplicateSequences = sequences.filter((seq, index) => sequences.indexOf(seq) !== index);

        return {
          isValid: missingSequences.length === 0 && duplicateSequences.length === 0,
          message: missingSequences.length > 0 || duplicateSequences.length > 0
            ? `Construction sequence issues: missing ${missingSequences.length}, duplicates ${duplicateSequences.length}`
            : 'Construction sequence is consistent',
          details: { missingSequences, duplicateSequences },
          suggestions: [
            ...missingSequences.map(seq => `Add construction detail with sequence ${seq}`),
            ...duplicateSequences.map(seq => `Fix duplicate sequence number ${seq}`)
          ]
        };
      }
    });

    // Business Rules
    this.addRule({
      id: 'material-code-uniqueness',
      name: 'Material Code Uniqueness',
      description: 'All BOM material codes must be unique',
      category: 'business',
      severity: 'error',
      modules: ['bom'],
      validate: (techPack: TechPack) => {
        const bomItems = techPack.bomItems || [];
        const materialCodes = bomItems.map(item => item.material_code);
        const uniqueCodes = new Set(materialCodes);
        
        const duplicates = materialCodes.filter((code, index) => 
          materialCodes.indexOf(code) !== index
        );

        return {
          isValid: duplicates.length === 0,
          message: duplicates.length > 0 
            ? `Duplicate material codes found: ${[...new Set(duplicates)].join(', ')}`
            : 'All material codes are unique',
          details: { duplicates: [...new Set(duplicates)] },
          suggestions: duplicates.length > 0 
            ? ['Ensure all BOM material codes are unique']
            : []
        };
      }
    });

    this.addRule({
      id: 'quantity-validation',
      name: 'Quantity Validation',
      description: 'All BOM quantities must be positive numbers',
      category: 'business',
      severity: 'error',
      modules: ['bom'],
      validate: (techPack: TechPack) => {
        const bomItems = techPack.bomItems || [];
        const invalidQuantities = bomItems.filter(item => 
          !item.quantity || item.quantity <= 0
        );

        return {
          isValid: invalidQuantities.length === 0,
          message: invalidQuantities.length > 0 
            ? `${invalidQuantities.length} BOM items have invalid quantities`
            : 'All quantities are valid',
          details: { invalidQuantities: invalidQuantities.length },
          suggestions: invalidQuantities.length > 0 
            ? ['Ensure all BOM quantities are positive numbers']
            : []
        };
      }
    });

    this.addRule({
      id: 'measurement-tolerance-validation',
      name: 'Measurement Tolerance Validation',
      description: 'Measurement tolerances must be valid ranges',
      category: 'business',
      severity: 'error',
      modules: ['measurement'],
      validate: (techPack: TechPack) => {
        const measurements = techPack.measurements || [];
        const invalidTolerances = measurements.filter(measurement => {
          const { tolerances } = measurement;
          return !tolerances || 
                 typeof tolerances.minusTol !== 'number' || 
                 typeof tolerances.plusTol !== 'number' ||
                 tolerances.minusTol < 0 || 
                 tolerances.plusTol < 0;
        });

        return {
          isValid: invalidTolerances.length === 0,
          message: invalidTolerances.length > 0 
            ? `${invalidTolerances.length} measurements have invalid tolerances`
            : 'All measurement tolerances are valid',
          details: { invalidTolerances: invalidTolerances.length },
          suggestions: invalidTolerances.length > 0 
            ? ['Ensure all measurement tolerances are valid positive numbers']
            : []
        };
      }
    });

    // Compliance Rules
    this.addRule({
      id: 'care-instruction-completeness',
      name: 'Care Instruction Completeness',
      description: 'Care instructions must be complete for all required languages',
      category: 'compliance',
      severity: 'warning',
      modules: ['care'],
      validate: (techPack: TechPack) => {
        const careInstructions = techPack.careInstructions || [];
        const requiredLanguages = ['en']; // Add more as needed
        
        const missingLanguages = requiredLanguages.filter(lang => 
          !careInstructions.some(instruction => instruction.language === lang)
        );

        return {
          isValid: missingLanguages.length === 0,
          message: missingLanguages.length > 0 
            ? `Missing care instructions for languages: ${missingLanguages.join(', ')}`
            : 'All required care instructions are present',
          details: { missingLanguages },
          suggestions: missingLanguages.map(lang => 
            `Add care instructions for ${lang} language`
          )
        };
      }
    });

    this.addRule({
      id: 'image-quality-validation',
      name: 'Image Quality Validation',
      description: 'TechPack should have high-quality images',
      category: 'compliance',
      severity: 'info',
      modules: ['techpack'],
      validate: (techPack: TechPack) => {
        const images = techPack.images || [];
        
        if (images.length === 0) {
          return {
            isValid: false,
            message: 'No images found',
            suggestions: ['Add product images to the TechPack']
          };
        }

        return {
          isValid: true,
          message: `${images.length} images found`,
          details: { imageCount: images.length }
        };
      }
    });
  }

  private addRule(rule: ValidationRule) {
    this.rules.push(rule);
  }

  // Validate entire TechPack
  public validateTechPack(techPack: TechPack): ValidationReport {
    const results: ValidationResult[] = [];
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    // Run all validation rules
    this.rules.forEach(rule => {
      try {
        const result = rule.validate(techPack);
        results.push(result);
        
        if (result.isValid) {
          infoCount++;
        } else {
          switch (rule.severity) {
            case 'error':
              errorCount++;
              break;
            case 'warning':
              warningCount++;
              break;
            case 'info':
              infoCount++;
              break;
          }
        }
      } catch (error) {
        console.error(`Error running validation rule ${rule.id}:`, error);
        results.push({
          isValid: false,
          message: `Validation rule failed: ${rule.name}`,
          details: { error: error.message }
        });
        errorCount++;
      }
    });

    // Calculate module scores
    const moduleScores = this.calculateModuleScores(techPack, results);
    
    // Calculate overall score
    const totalRules = this.rules.length;
    const passedRules = results.filter(r => r.isValid).length;
    const overallScore = Math.round((passedRules / totalRules) * 100);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    return {
      techPackId: techPack.id,
      timestamp: new Date(),
      overall: {
        isValid: errorCount === 0,
        score: overallScore,
        errorCount,
        warningCount,
        infoCount
      },
      moduleScores,
      results,
      recommendations
    };
  }

  private calculateModuleScores(techPack: TechPack, results: ValidationResult[]): any {
    const modules = ['bom', 'measurement', 'construction', 'care'];
    const moduleScores: any = {};

    modules.forEach(module => {
      const moduleResults = results.filter(result => 
        result.affectedModules?.includes(module)
      );
      
      if (moduleResults.length === 0) {
        moduleScores[module] = 100;
      } else {
        const passedRules = moduleResults.filter(r => r.isValid).length;
        moduleScores[module] = Math.round((passedRules / moduleResults.length) * 100);
      }
    });

    return moduleScores;
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (!result.isValid && result.suggestions) {
        recommendations.push(...result.suggestions);
      }
    });

    // Remove duplicates and return unique recommendations
    return [...new Set(recommendations)];
  }

  // Validate specific module
  public validateModule(techPack: TechPack, module: string): ValidationResult[] {
    return this.rules
      .filter(rule => rule.modules.includes(module))
      .map(rule => rule.validate(techPack));
  }

  // Get validation rules by category
  public getRulesByCategory(category: string): ValidationRule[] {
    return this.rules.filter(rule => rule.category === category);
  }

  // Add custom validation rule
  public addCustomRule(rule: ValidationRule) {
    this.rules.push(rule);
  }

  // Remove validation rule
  public removeRule(ruleId: string) {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  // Get validation statistics
  public getValidationStatistics(techPacks: TechPack[]): any {
    const totalTechPacks = techPacks.length;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;
    let validTechPacks = 0;

    techPacks.forEach(techPack => {
      const report = this.validateTechPack(techPack);
      totalErrors += report.overall.errorCount;
      totalWarnings += report.overall.warningCount;
      totalInfo += report.overall.infoCount;
      
      if (report.overall.isValid) {
        validTechPacks++;
      }
    });

    return {
      totalTechPacks,
      validTechPacks,
      invalidTechPacks: totalTechPacks - validTechPacks,
      totalErrors,
      totalWarnings,
      totalInfo,
      averageScore: techPacks.reduce((sum, techPack) => {
        const report = this.validateTechPack(techPack);
        return sum + report.overall.score;
      }, 0) / totalTechPacks || 0
    };
  }
}

export const validationEngine = new ValidationEngine();
export default validationEngine;
