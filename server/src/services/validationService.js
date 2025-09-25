const { mongoDb } = require('../config/database');
const { businessRules } = require('../config/validation');

class ValidationService {
  // Cross-module data validation
  async validateTechPackData(techPackId) {
    const validationResults = {
        isValid: true,
        errors: [],
        warnings: [],
        completeness: {},
        consistency: {}
      };

      // Get tech pack document
      const techPack = await mongoDb.collection('techpacks').findOne({ id: techPackId, is_active: true });
      if (!techPack) {
        validationResults.isValid = false;
        validationResults.errors.push('TechPack not found');
        return validationResults;
      }

      const bomItems = techPack.bomItems || [];
      const measurements = techPack.measurements || [];
      const constructionDetails = techPack.constructionDetails || [];
      const careInstructions = techPack.careInstructions || [];

      // 1. Completeness Validation
      validationResults.completeness = this.validateCompleteness({
        techPack,
        bomItems,
        measurements,
        constructionDetails,
        careInstructions
      });

      // 2. Consistency Validation
      validationResults.consistency = await this.validateConsistency({
        techPackId,
        bomItems,
        measurements,
        constructionDetails
      });

      // 3. Business Rules Validation
      const businessValidation = businessRules.validateTechPackCompleteness({
        materials: bomItems,
        measurements,
        constructionDetails
      });

      if (!businessValidation.isValid) {
        validationResults.errors.push(...businessValidation.errors);
      }

      // 4. BOM Consistency
      const bomValidation = businessRules.validateBOMConsistency(bomItems);
      if (!bomValidation.isValid) {
        validationResults.errors.push(...bomValidation.errors);
      }

      // 5. Measurement Consistency
      const measurementValidation = businessRules.validateMeasurementConsistency(measurements);
      if (!measurementValidation.isValid) {
        validationResults.errors.push(...measurementValidation.errors);
      }

      // 6. Cross-module consistency checks
      const crossModuleValidation = await this.validateCrossModuleConsistency({
        techPackId,
        bomItems,
        measurements,
        constructionDetails
      });

      validationResults.errors.push(...crossModuleValidation.errors);
      validationResults.warnings.push(...crossModuleValidation.warnings);

      // Overall validation result
      validationResults.isValid = validationResults.errors.length === 0;

      return validationResults;
  }

  // Validate completeness of all modules
  validateCompleteness(data) {
    const { techPack, bomItems, measurements, constructionDetails, careInstructions } = data;
    const completeness = {
      basic: 0,
      bom: 0,
      measurements: 0,
      construction: 0,
      care: 0,
      overall: 0
    };

    // Basic info completeness
    const basicFields = ['name', 'category', 'status', 'season', 'brand', 'designer'];
    const basicComplete = basicFields.filter(field => techPack[field]).length;
    completeness.basic = (basicComplete / basicFields.length) * 100;

    // BOM completeness
    if (bomItems.length > 0) {
      const requiredBomFields = ['part', 'material_code', 'quantity', 'uom', 'supplier'];
      const bomComplete = bomItems.map(item => 
        requiredBomFields.filter(field => item[field]).length / requiredBomFields.length
      ).reduce((a, b) => a + b, 0) / bomItems.length;
      completeness.bom = bomComplete * 100;
    }

    // Measurements completeness
    if (measurements.length > 0) {
      const requiredPomFields = ['pom_code', 'pom_name', 'tolerances', 'measurements'];
      const pomComplete = measurements.map(spec => 
        requiredPomFields.filter(field => spec[field]).length / requiredPomFields.length
      ).reduce((a, b) => a + b, 0) / measurements.length;
      completeness.measurements = pomComplete * 100;
    }

    // Construction completeness
    if (constructionDetails.length > 0) {
      const requiredConstructionFields = ['category', 'name', 'description', 'sequence'];
      const constructionComplete = constructionDetails.map(detail => 
        requiredConstructionFields.filter(field => detail[field]).length / requiredConstructionFields.length
      ).reduce((a, b) => a + b, 0) / constructionDetails.length;
      completeness.construction = constructionComplete * 100;
    }

    // Care instructions completeness
    if (careInstructions.length > 0) {
      const requiredCareFields = ['language', 'symbols', 'text_instructions'];
      const careComplete = careInstructions.map(care => 
        requiredCareFields.filter(field => care[field] && 
          (Array.isArray(care[field]) ? care[field].length > 0 : care[field])
        ).length / requiredCareFields.length
      ).reduce((a, b) => a + b, 0) / careInstructions.length;
      completeness.care = careComplete * 100;
    }

    // Overall completeness
    const moduleScores = [completeness.basic, completeness.bom, completeness.measurements, 
                         completeness.construction, completeness.care].filter(score => score > 0);
    completeness.overall = moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length;

    return completeness;
  }

  // Validate consistency across modules
  async validateConsistency(data) {
    const { techPackId, bomItems, measurements, constructionDetails } = data;
    const consistency = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check BOM and measurement consistency
    if (bomItems.length > 0 && measurements.length > 0) {
      // Check if all BOM items have corresponding measurements
      const bomPlacements = new Set(bomItems.map(item => item.placement));
      const measurementCategories = new Set(measurements.map(spec => spec.category));
      
      const missingMeasurements = [...bomPlacements].filter(placement => 
        !measurementCategories.has(placement)
      );
      
      if (missingMeasurements.length > 0) {
        consistency.warnings.push(
          `Missing measurement specifications for BOM placements: ${missingMeasurements.join(', ')}`
        );
      }
    }

    // Check construction detail sequence consistency
    if (constructionDetails.length > 0) {
      const sequences = constructionDetails.map(detail => detail.sequence).sort((a, b) => a - b);
      const expectedSequences = Array.from({ length: sequences.length }, (_, i) => i + 1);
      
      const missingSequences = expectedSequences.filter(seq => !sequences.includes(seq));
      const duplicateSequences = sequences.filter((seq, index) => sequences.indexOf(seq) !== index);
      
      if (missingSequences.length > 0) {
        consistency.errors.push(`Missing construction sequence numbers: ${missingSequences.join(', ')}`);
      }
      
      if (duplicateSequences.length > 0) {
        consistency.errors.push(`Duplicate construction sequence numbers: ${duplicateSequences.join(', ')}`);
      }
    }

    // Check material code consistency
    const materialCodes = new Set();
    const duplicateMaterialCodes = [];
    
    for (const item of bomItems) {
      if (materialCodes.has(item.material_code)) {
        duplicateMaterialCodes.push(item.material_code);
      }
      materialCodes.add(item.material_code);
    }
    
    if (duplicateMaterialCodes.length > 0) {
      consistency.errors.push(`Duplicate material codes: ${duplicateMaterialCodes.join(', ')}`);
    }

    consistency.isValid = consistency.errors.length === 0;
    return consistency;
  }

  // Validate cross-module consistency
  async validateCrossModuleConsistency(data) {
    const { techPackId, bomItems, measurements, constructionDetails } = data;
    const validation = {
      errors: [],
      warnings: []
    };

    // Check if BOM materials are referenced in construction details
    if (bomItems.length > 0 && constructionDetails.length > 0) {
      const bomMaterials = new Set(bomItems.map(item => item.material_code));
      const constructionMaterials = new Set();
      
      constructionDetails.forEach(detail => {
        if (detail.materials && Array.isArray(detail.materials)) {
          detail.materials.forEach(material => constructionMaterials.add(material));
        }
      });
      
      const unreferencedMaterials = [...bomMaterials].filter(material => 
        !constructionMaterials.has(material)
      );
      
      if (unreferencedMaterials.length > 0) {
        validation.warnings.push(
          `BOM materials not referenced in construction details: ${unreferencedMaterials.join(', ')}`
        );
      }
    }

    // Check measurement unit consistency
    if (measurements.length > 0) {
      const units = new Set(measurements.map(spec => spec.unit));
      if (units.size > 1) {
        validation.warnings.push(
          `Mixed measurement units detected: ${[...units].join(', ')}. Consider standardizing.`
        );
      }
    }

    // Check for missing critical measurements
    const criticalMeasurements = ['Chest', 'Waist', 'Hip', 'Length'];
    const existingMeasurements = new Set(measurements.map(spec => spec.pom_name));
    const missingCritical = criticalMeasurements.filter(measurement => 
      !existingMeasurements.has(measurement)
    );
    
    if (missingCritical.length > 0) {
      validation.warnings.push(
        `Missing critical measurements: ${missingCritical.join(', ')}`
      );
    }

    return validation;
  }

  // Validate specific business rules
  async validateBusinessRules(techPackId, ruleType) {
    switch (ruleType) {
        case 'export_ready':
          return await this.validateExportReadiness(techPackId);
        case 'production_ready':
          return await this.validateProductionReadiness(techPackId);
        case 'approval_ready':
          return await this.validateApprovalReadiness(techPackId);
        default:
          throw new Error(`Unknown rule type: ${ruleType}`);
    }
  }

  // Validate export readiness
  async validateExportReadiness(techPackId) {
    const validation = await this.validateTechPackData(techPackId);
    const exportRules = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if all required data is present
    if (validation.completeness.overall < 90) {
      exportRules.isValid = false;
      exportRules.errors.push('TechPack completeness must be at least 90% for export');
    }

    // Check if images are present
    const doc = await mongoDb.collection('techpacks').findOne({ id: techPackId }, { projection: { images: 1 } });
    const images = doc?.images || [];
    
    if (images.length === 0) {
      exportRules.warnings.push('No images found - consider adding product images');
    }

    // Check if all modules have data
    if (validation.completeness.bom < 50) {
      exportRules.errors.push('BOM data is incomplete');
    }
    
    if (validation.completeness.measurements < 50) {
      exportRules.errors.push('Measurement data is incomplete');
    }

    exportRules.isValid = exportRules.errors.length === 0;
    return exportRules;
  }

  // Validate production readiness
  async validateProductionReadiness(techPackId) {
    const validation = await this.validateTechPackData(techPackId);
    const productionRules = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if tech pack is approved
    const doc = await mongoDb.collection('techpacks').findOne({ id: techPackId }, { projection: { status: 1 } });
    const status = doc?.status;
    
    if (status !== 'approved') {
      productionRules.isValid = false;
      productionRules.errors.push('TechPack must be approved before production');
    }

    // Check completeness requirements
    if (validation.completeness.overall < 95) {
      productionRules.isValid = false;
      productionRules.errors.push('TechPack must be 95% complete for production');
    }

    // Check for critical data
    if (validation.completeness.bom < 80) {
      productionRules.errors.push('BOM data must be 80% complete for production');
    }

    productionRules.isValid = productionRules.errors.length === 0;
    return productionRules;
  }

  // Validate approval readiness
  async validateApprovalReadiness(techPackId) {
    const validation = await this.validateTechPackData(techPackId);
    const approvalRules = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check basic completeness
    if (validation.completeness.basic < 100) {
      approvalRules.isValid = false;
      approvalRules.errors.push('All basic information must be complete');
    }

    // Check for required modules
    if (validation.completeness.bom < 70) {
      approvalRules.errors.push('BOM data must be at least 70% complete');
    }

    if (validation.completeness.measurements < 70) {
      approvalRules.errors.push('Measurement data must be at least 70% complete');
    }

    if (validation.completeness.construction < 70) {
      approvalRules.errors.push('Construction details must be at least 70% complete');
    }

    approvalRules.isValid = approvalRules.errors.length === 0;
    return approvalRules;
  }
}

module.exports = { validationService: new ValidationService() };
