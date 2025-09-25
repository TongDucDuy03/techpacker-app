import { BOMItem, POMSpecification, ConstructionDetail, TechPack } from '../types';
import { store } from '../store';
import { 
  updateTechPackState,
  handleRealtimeUpdate as handleTechPackUpdate 
} from '../store/slices/techPackSlice';
import { 
  handleRealtimeUpdate as handleBOMUpdate 
} from '../store/slices/bomSlice';
import { 
  handleRealtimeUpdate as handleMeasurementUpdate 
} from '../store/slices/measurementSlice';
import { 
  handleRealtimeUpdate as handleConstructionUpdate 
} from '../store/slices/constructionSlice';

export interface WorkflowLink {
  id: string;
  sourceType: 'bom' | 'measurement' | 'construction';
  sourceId: string;
  targetType: 'bom' | 'measurement' | 'construction';
  targetId: string;
  relationship: 'requires' | 'influences' | 'depends_on' | 'conflicts_with';
  strength: number; // 0-1
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  sourceModule: string;
  targetModule: string;
  condition: (source: any, target: any) => boolean;
  action: (source: any, target: any) => any;
  priority: number;
  isActive: boolean;
}

class WorkflowService {
  private workflowRules: WorkflowRule[] = [];
  private workflowLinks: Map<string, WorkflowLink> = new Map();

  constructor() {
    this.initializeWorkflowRules();
  }

  private initializeWorkflowRules() {
    // BOM → POM linking rules
    this.addWorkflowRule({
      id: 'bom-pom-placement',
      name: 'BOM Placement to POM Category',
      description: 'Link BOM item placement to POM measurement category',
      sourceModule: 'bom',
      targetModule: 'measurement',
      condition: (bomItem: BOMItem, pomSpec: POMSpecification) => {
        return bomItem.placement === pomSpec.category;
      },
      action: (bomItem: BOMItem, pomSpec: POMSpecification) => {
        return {
          bomItemId: bomItem.id,
          pomSpecId: pomSpec.id,
          relationship: 'requires',
          strength: 0.8
        };
      },
      priority: 1,
      isActive: true
    });

    // POM → Construction linking rules
    this.addWorkflowRule({
      id: 'pom-construction-measurement',
      name: 'POM Measurement to Construction Detail',
      description: 'Link POM measurements to construction details that require them',
      sourceModule: 'measurement',
      targetModule: 'construction',
      condition: (pomSpec: POMSpecification, constructionDetail: ConstructionDetail) => {
        return constructionDetail.materials.some(material => 
          pomSpec.pomName.toLowerCase().includes(material.toLowerCase()) ||
          material.toLowerCase().includes(pomSpec.pomName.toLowerCase())
        );
      },
      action: (pomSpec: POMSpecification, constructionDetail: ConstructionDetail) => {
        return {
          pomSpecId: pomSpec.id,
          constructionDetailId: constructionDetail.id,
          relationship: 'influences',
          strength: 0.6
        };
      },
      priority: 2,
      isActive: true
    });

    // BOM → Construction linking rules
    this.addWorkflowRule({
      id: 'bom-construction-materials',
      name: 'BOM Materials to Construction Details',
      description: 'Link BOM materials to construction details that use them',
      sourceModule: 'bom',
      targetModule: 'construction',
      condition: (bomItem: BOMItem, constructionDetail: ConstructionDetail) => {
        return constructionDetail.materials.some(material => 
          material.toLowerCase().includes(bomItem.material_code.toLowerCase()) ||
          bomItem.material_code.toLowerCase().includes(material.toLowerCase())
        );
      },
      action: (bomItem: BOMItem, constructionDetail: ConstructionDetail) => {
        return {
          bomItemId: bomItem.id,
          constructionDetailId: constructionDetail.id,
          relationship: 'requires',
          strength: 0.9
        };
      },
      priority: 1,
      isActive: true
    });

    // Cross-module validation rules
    this.addWorkflowRule({
      id: 'measurement-construction-consistency',
      name: 'Measurement-Construction Consistency',
      description: 'Ensure measurements are consistent with construction requirements',
      sourceModule: 'measurement',
      targetModule: 'construction',
      condition: (pomSpec: POMSpecification, constructionDetail: ConstructionDetail) => {
        // Check if construction detail requires specific measurements
        return constructionDetail.specialInstructions.some(instruction => 
          instruction.toLowerCase().includes('measurement') ||
          instruction.toLowerCase().includes(pomSpec.pomName.toLowerCase())
        );
      },
      action: (pomSpec: POMSpecification, constructionDetail: ConstructionDetail) => {
        return {
          pomSpecId: pomSpec.id,
          constructionDetailId: constructionDetail.id,
          relationship: 'depends_on',
          strength: 0.7
        };
      },
      priority: 3,
      isActive: true
    });
  }

  private addWorkflowRule(rule: WorkflowRule) {
    this.workflowRules.push(rule);
  }

  // Analyze and create workflow links
  public analyzeWorkflowLinks(techPack: TechPack): WorkflowLink[] {
    const links: WorkflowLink[] = [];
    const { bomItems = [], measurements = [], constructionDetails = [] } = techPack;

    // Apply workflow rules
    this.workflowRules
      .filter(rule => rule.isActive)
      .sort((a, b) => a.priority - b.priority)
      .forEach(rule => {
        if (rule.sourceModule === 'bom' && rule.targetModule === 'measurement') {
          bomItems.forEach(bomItem => {
            measurements.forEach(pomSpec => {
              if (rule.condition(bomItem, pomSpec)) {
                const linkData = rule.action(bomItem, pomSpec);
                const link: WorkflowLink = {
                  id: `link_${bomItem.id}_${pomSpec.id}`,
                  sourceType: 'bom',
                  sourceId: bomItem.id,
                  targetType: 'measurement',
                  targetId: pomSpec.id,
                  relationship: linkData.relationship,
                  strength: linkData.strength,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                links.push(link);
                this.workflowLinks.set(link.id, link);
              }
            });
          });
        }

        if (rule.sourceModule === 'measurement' && rule.targetModule === 'construction') {
          measurements.forEach(pomSpec => {
            constructionDetails.forEach(constructionDetail => {
              if (rule.condition(pomSpec, constructionDetail)) {
                const linkData = rule.action(pomSpec, constructionDetail);
                const link: WorkflowLink = {
                  id: `link_${pomSpec.id}_${constructionDetail.id}`,
                  sourceType: 'measurement',
                  sourceId: pomSpec.id,
                  targetType: 'construction',
                  targetId: constructionDetail.id,
                  relationship: linkData.relationship,
                  strength: linkData.strength,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                links.push(link);
                this.workflowLinks.set(link.id, link);
              }
            });
          });
        }

        if (rule.sourceModule === 'bom' && rule.targetModule === 'construction') {
          bomItems.forEach(bomItem => {
            constructionDetails.forEach(constructionDetail => {
              if (rule.condition(bomItem, constructionDetail)) {
                const linkData = rule.action(bomItem, constructionDetail);
                const link: WorkflowLink = {
                  id: `link_${bomItem.id}_${constructionDetail.id}`,
                  sourceType: 'bom',
                  sourceId: bomItem.id,
                  targetType: 'construction',
                  targetId: constructionDetail.id,
                  relationship: linkData.relationship,
                  strength: linkData.strength,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                links.push(link);
                this.workflowLinks.set(link.id, link);
              }
            });
          });
        }
      });

    return links;
  }

  // Handle BOM updates and propagate to related modules
  public handleBOMUpdate(techPackId: string, bomItem: BOMItem, operation: 'create' | 'update' | 'delete') {
    const links = Array.from(this.workflowLinks.values())
      .filter(link => link.sourceType === 'bom' && link.sourceId === bomItem.id);

    links.forEach(link => {
      if (link.targetType === 'measurement') {
        this.propagateToMeasurement(techPackId, bomItem, link, operation);
      } else if (link.targetType === 'construction') {
        this.propagateToConstruction(techPackId, bomItem, link, operation);
      }
    });
  }

  // Handle measurement updates and propagate to related modules
  public handleMeasurementUpdate(techPackId: string, pomSpec: POMSpecification, operation: 'create' | 'update' | 'delete') {
    const links = Array.from(this.workflowLinks.values())
      .filter(link => link.sourceType === 'measurement' && link.sourceId === pomSpec.id);

    links.forEach(link => {
      if (link.targetType === 'construction') {
        this.propagateToConstruction(techPackId, pomSpec, link, operation);
      }
    });
  }

  // Handle construction updates and propagate to related modules
  public handleConstructionUpdate(techPackId: string, constructionDetail: ConstructionDetail, operation: 'create' | 'update' | 'delete') {
    const links = Array.from(this.workflowLinks.values())
      .filter(link => link.targetType === 'construction' && link.targetId === constructionDetail.id);

    links.forEach(link => {
      if (link.sourceType === 'bom') {
        this.propagateToBOM(techPackId, constructionDetail, link, operation);
      } else if (link.sourceType === 'measurement') {
        this.propagateToMeasurement(techPackId, constructionDetail, link, operation);
      }
    });
  }

  private propagateToMeasurement(techPackId: string, sourceData: any, link: WorkflowLink, operation: string) {
    // Update measurement based on BOM changes
    const updateData = {
      measurements: {
        [link.targetId]: {
          ...sourceData,
          lastUpdated: new Date().toISOString(),
          source: 'bom_propagation'
        }
      }
    };

    // Dispatch real-time update
    store.dispatch(handleMeasurementUpdate({
      techPackId,
      module: 'measurement',
      updateData
    }));
  }

  private propagateToConstruction(techPackId: string, sourceData: any, link: WorkflowLink, operation: string) {
    // Update construction based on BOM or measurement changes
    const updateData = {
      constructionDetails: {
        [link.targetId]: {
          ...sourceData,
          lastUpdated: new Date().toISOString(),
          source: `${link.sourceType}_propagation`
        }
      }
    };

    // Dispatch real-time update
    store.dispatch(handleConstructionUpdate({
      techPackId,
      module: 'construction',
      updateData
    }));
  }

  private propagateToBOM(techPackId: string, sourceData: any, link: WorkflowLink, operation: string) {
    // Update BOM based on construction changes
    const updateData = {
      bomItems: {
        [link.sourceId]: {
          ...sourceData,
          lastUpdated: new Date().toISOString(),
          source: 'construction_propagation'
        }
      }
    };

    // Dispatch real-time update
    store.dispatch(handleBOMUpdate({
      techPackId,
      module: 'bom',
      updateData
    }));
  }

  // Validate workflow consistency
  public validateWorkflowConsistency(techPack: TechPack): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { bomItems = [], measurements = [], constructionDetails = [] } = techPack;

    // Check for orphaned BOM items
    const bomLinks = Array.from(this.workflowLinks.values())
      .filter(link => link.sourceType === 'bom');
    
    const linkedBOMItems = new Set(bomLinks.map(link => link.sourceId));
    const orphanedBOMItems = bomItems.filter(item => !linkedBOMItems.has(item.id));
    
    if (orphanedBOMItems.length > 0) {
      warnings.push(`${orphanedBOMItems.length} BOM items are not linked to any measurements or construction details`);
      suggestions.push('Consider linking BOM items to relevant measurements or construction details');
    }

    // Check for missing measurements
    const measurementLinks = Array.from(this.workflowLinks.values())
      .filter(link => link.targetType === 'measurement');
    
    const requiredMeasurements = new Set(measurementLinks.map(link => link.targetId));
    const missingMeasurements = Array.from(requiredMeasurements).filter(id => 
      !measurements.some(measurement => measurement.id === id)
    );
    
    if (missingMeasurements.length > 0) {
      errors.push(`${missingMeasurements.length} required measurements are missing`);
    }

    // Check for construction details without materials
    const constructionWithoutMaterials = constructionDetails.filter(detail => 
      !detail.materials || detail.materials.length === 0
    );
    
    if (constructionWithoutMaterials.length > 0) {
      warnings.push(`${constructionWithoutMaterials.length} construction details have no materials specified`);
      suggestions.push('Add materials to construction details for better workflow integration');
    }

    // Check for measurement unit consistency
    const measurementUnits = new Set(measurements.map(measurement => measurement.unit));
    if (measurementUnits.size > 1) {
      warnings.push('Mixed measurement units detected');
      suggestions.push('Consider standardizing measurement units for consistency');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Get workflow visualization data
  public getWorkflowVisualization(techPackId: string) {
    const links = Array.from(this.workflowLinks.values());
    
    return {
      nodes: [
        ...links.map(link => ({
          id: link.sourceId,
          type: link.sourceType,
          label: link.sourceType.toUpperCase()
        })),
        ...links.map(link => ({
          id: link.targetId,
          type: link.targetType,
          label: link.targetType.toUpperCase()
        }))
      ].filter((node, index, self) => 
        index === self.findIndex(n => n.id === node.id)
      ),
      edges: links.map(link => ({
        id: link.id,
        source: link.sourceId,
        target: link.targetId,
        relationship: link.relationship,
        strength: link.strength
      }))
    };
  }

  // Clear workflow links for a tech pack
  public clearWorkflowLinks(techPackId: string) {
    const linksToRemove = Array.from(this.workflowLinks.entries())
      .filter(([_, link]) => 
        link.sourceId.includes(techPackId) || link.targetId.includes(techPackId)
      );
    
    linksToRemove.forEach(([id, _]) => {
      this.workflowLinks.delete(id);
    });
  }

  // Get workflow statistics
  public getWorkflowStatistics(techPackId: string) {
    const links = Array.from(this.workflowLinks.values());
    
    return {
      totalLinks: links.length,
      bomToMeasurement: links.filter(link => 
        link.sourceType === 'bom' && link.targetType === 'measurement'
      ).length,
      measurementToConstruction: links.filter(link => 
        link.sourceType === 'measurement' && link.targetType === 'construction'
      ).length,
      bomToConstruction: links.filter(link => 
        link.sourceType === 'bom' && link.targetType === 'construction'
      ).length,
      averageStrength: links.reduce((sum, link) => sum + link.strength, 0) / links.length || 0,
      relationshipTypes: {
        requires: links.filter(link => link.relationship === 'requires').length,
        influences: links.filter(link => link.relationship === 'influences').length,
        depends_on: links.filter(link => link.relationship === 'depends_on').length,
        conflicts_with: links.filter(link => link.relationship === 'conflicts_with').length
      }
    };
  }
}

export const workflowService = new WorkflowService();
export default workflowService;
