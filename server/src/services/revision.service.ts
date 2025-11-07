import { ITechPack } from '../models/techpack.model';
import Revision, { IRevisionChange } from '../models/revision.model';
import _ from 'lodash';
import { Types } from 'mongoose';

export type DetailedRevisionChange = IRevisionChange & {
  sectionChanges?: string[];
  diffData?: Record<string, { old: any; new: any }>;
};

class RevisionService {
  /**
   * Finds the latest revision for a TechPack and increments its version number (e.g., v1.1 -> v1.2).
   * If no revision exists, it starts from v1.1.
   */
  public async autoIncrementVersion(techPackId: Types.ObjectId): Promise<{ revisionVersion: string }> {
    const lastRevision = await Revision.findOne({ techPackId })
      .sort({ createdAt: -1 })
      .select('version');

    const currentVersion = lastRevision ? lastRevision.version : 'v1.0'; // Start from v1.0 if none exist

    const cleaned = currentVersion.replace(/^v/i, '');
    let [major, minor] = cleaned.split('.').map(num => parseInt(num, 10));

    major = Number.isFinite(major) ? major : 1;
    minor = Number.isFinite(minor) ? minor : 0;

    // Increment minor version
    minor += 1;

    const nextVersion = `v${major}.${minor}`;
    return {
      revisionVersion: nextVersion
    };
  }

  /**
   * Compares two versions of a TechPack and generates a summary of changes and detailed diff.
   */
  public compareTechPacks(oldTechPack: ITechPack, newTechPack: ITechPack): DetailedRevisionChange {
    const changes: DetailedRevisionChange = {
      summary: '',
      details: {},
      sectionChanges: [],
      diffData: {}
    };

    try {
      if (!oldTechPack || !newTechPack) {
        changes.summary = 'No changes detected.';
        return changes;
      }

      const trackedArraySections: (keyof ITechPack)[] = ['bom', 'measurements', 'colorways', 'howToMeasure'];

      // Array sections: mark added/removed/modified counts
      // Use ID-based comparison for better accuracy
      trackedArraySections.forEach(section => {
        try {
          const oldSection = ((oldTechPack as any)[section] as any[]) || [];
          const newSection = ((newTechPack as any)[section] as any[]) || [];

          // Normalize arrays: convert to objects keyed by ID for comparison
          const getItemId = (item: any, index: number): string => {
            // Prefer a canonical string id for comparison. Accept _id (ObjectId) or id (string).
            if (!item) return `__index_${index}`;
            const rawId = item._id ?? item.id;
            if (rawId !== undefined && rawId !== null) {
              try {
                return rawId.toString();
              } catch (e) {
                return String(rawId);
              }
            }
            return `__index_${index}`;
          };

          // Normalize items: ensure consistent ID field format and convert ObjectIds to plain strings
          const normalizeItem = (item: any): any => {
            // Handle null/undefined
            if (item === null || item === undefined) {
              return null;
            }
            
            // Handle non-objects (shouldn't happen but be safe)
            if (typeof item !== 'object') {
              return item;
            }
            
            // Deep clone to avoid mutating original
            const normalized = _.cloneDeep(item);

            // Build canonical id string if present
            let canonicalId: string | undefined;
            if (normalized._id !== undefined && normalized._id !== null) {
              try {
                canonicalId = (normalized._id as any).toString();
              } catch (e) {
                canonicalId = String(normalized._id);
              }
            } else if (normalized.id !== undefined && normalized.id !== null) {
              canonicalId = String(normalized.id);
            }

            if (canonicalId) {
              normalized._id = canonicalId;
              normalized.id = canonicalId;
            }

            // Remove MongoDB internal fields for cleaner comparison
            delete normalized.__v;
            
            // Normalize null/undefined values in nested objects (convert undefined to null for consistency)
            const normalizeValues = (obj: any): any => {
              if (obj === null || obj === undefined) return null;
              if (typeof obj !== 'object' || obj instanceof Date) return obj;
              if (Array.isArray(obj)) {
                return obj.map(normalizeValues);
              }
              const result: any = {};
              Object.keys(obj).forEach(key => {
                const value = obj[key];
                result[key] = value === undefined ? null : normalizeValues(value);
              });
              return result;
            };
            
            return normalizeValues(normalized);
          };

          // Create maps by ID for efficient lookup
          const oldMap = new Map<string, { item: any; index: number }>();
          const newMap = new Map<string, { item: any; index: number }>();

          oldSection.forEach((item, idx) => {
            const normalized = normalizeItem(item);
            const id = getItemId(normalized, idx);
            oldMap.set(id, { item: normalized, index: idx });
          });

          newSection.forEach((item, idx) => {
            const normalized = normalizeItem(item);
            const id = getItemId(normalized, idx);
            newMap.set(id, { item: normalized, index: idx });
          });

          // Helper to get key identifying fields hash for matching (used to detect same item with different ID)
          // Uses stable fields that don't change when item is modified
          const getKeyFieldsHash = (section: string, item: any): string => {
            if (!item || typeof item !== 'object') return '';
            
            const keyFields = this.getKeyFieldsForMatching(section, item);
            // Only create hash if we have at least one key field with non-empty value
            const hasKeyFields = Object.keys(keyFields).length > 0 && 
              Object.values(keyFields).some(val => val !== null && val !== undefined && val !== '');
            
            if (!hasKeyFields) return '';
            
            // Normalize key fields for consistent hashing (trim strings, handle null/undefined)
            const normalized: any = {};
            Object.keys(keyFields).forEach(key => {
              const val = keyFields[key];
              if (val === null || val === undefined) {
                normalized[key] = null;
              } else if (typeof val === 'string') {
                normalized[key] = val.trim().toLowerCase();
              } else {
                normalized[key] = val;
              }
            });
            
            // Sort keys for consistent hash
            const sortedKeys = Object.keys(normalized).sort();
            const sortedObj: any = {};
            sortedKeys.forEach(key => {
              sortedObj[key] = normalized[key];
            });
            
            return JSON.stringify(sortedObj);
          };

          // Build key-fields-based maps to detect items that are the same entity but with different IDs
          // This handles cases where frontend sends items with new IDs but same identifying fields
          const oldKeyFieldsToIdMap = new Map<string, string[]>(); // keyFieldsHash -> [oldId1, oldId2, ...]
          const newKeyFieldsToIdMap = new Map<string, string[]>(); // keyFieldsHash -> [newId1, newId2, ...]
          const keyFieldsMatchedPairs = new Map<string, string>(); // oldId -> newId

          // Build maps: one key hash can map to multiple IDs (in case of duplicates)
          oldMap.forEach((data, id) => {
            const keyHash = getKeyFieldsHash(String(section), data.item);
            if (keyHash) {
              if (!oldKeyFieldsToIdMap.has(keyHash)) {
                oldKeyFieldsToIdMap.set(keyHash, []);
              }
              oldKeyFieldsToIdMap.get(keyHash)!.push(id);
            }
          });

          newMap.forEach((data, id) => {
            const keyHash = getKeyFieldsHash(String(section), data.item);
            if (!keyHash) return; // Skip if no key fields available
            
            if (!newKeyFieldsToIdMap.has(keyHash)) {
              newKeyFieldsToIdMap.set(keyHash, []);
            }
            newKeyFieldsToIdMap.get(keyHash)!.push(id);
          });

          // Match items by key fields: for each new item, find corresponding old item
          // Handle duplicates by matching in order (first new item matches first old item with same keys)
          newMap.forEach((newData, newId) => {
            // Skip if already matched by ID
            if (oldMap.has(newId)) return;
            
            const keyHash = getKeyFieldsHash(String(section), newData.item);
            if (!keyHash) return;
            
            const oldIdsWithSameKeys = oldKeyFieldsToIdMap.get(keyHash);
            if (oldIdsWithSameKeys && oldIdsWithSameKeys.length > 0) {
              // Find an old ID that hasn't been matched yet
              // For duplicates, match in order (first new matches first old)
              const unmatchedOldId = oldIdsWithSameKeys.find(oldId => !keyFieldsMatchedPairs.has(oldId));
              if (unmatchedOldId) {
                // Match this pair
                keyFieldsMatchedPairs.set(unmatchedOldId, newId);
              }
            }
          });

          // Also match in reverse: for each old item not matched by ID, find corresponding new item
          // This handles cases where new items were already matched but old items weren't
          oldMap.forEach((oldData, oldId) => {
            // Skip if already matched by ID or key fields
            if (oldMap.has(oldId) && newMap.has(oldId)) return; // Matched by ID
            if (keyFieldsMatchedPairs.has(oldId)) return; // Already matched by key fields
            
            const keyHash = getKeyFieldsHash(String(section), oldData.item);
            if (!keyHash) return;
            
            const newIdsWithSameKeys = newKeyFieldsToIdMap.get(keyHash);
            if (newIdsWithSameKeys && newIdsWithSameKeys.length > 0) {
              // Find a new ID that hasn't been matched yet
              const unmatchedNewId = newIdsWithSameKeys.find(newId => {
                // Check if this newId is already matched to another oldId
                const matchedNewIds = Array.from(keyFieldsMatchedPairs.values());
                return !matchedNewIds.includes(newId);
              });
              if (unmatchedNewId) {
                // Match this pair
                keyFieldsMatchedPairs.set(oldId, unmatchedNewId);
              }
            }
          });

          // Find added, removed, and modified items
          const added: string[] = [];
          const removed: string[] = [];
          const modified: string[] = [];
          const processedOldIds = new Set<string>();
          const processedNewIds = new Set<string>();

          // Helper to flatten nested objects for diff display
          const flattenDiff = (obj: any, prefix: string, result: Record<string, any>): void => {
            if (obj === null || obj === undefined) {
              result[prefix] = obj;
              return;
            }
            if (typeof obj !== 'object' || obj instanceof Date) {
              result[prefix] = obj;
              return;
            }
            if (Array.isArray(obj)) {
              // For arrays, show as array but also check if it's a simple array
              if (obj.length === 0) {
                result[prefix] = [];
                return;
              }
              // If array contains primitives, show as is
              if (obj.every(item => typeof item !== 'object' || item === null)) {
                result[prefix] = obj;
                return;
              }
              // For arrays of objects, flatten each item
              obj.forEach((item, idx) => {
                flattenDiff(item, `${prefix}[${idx}]`, result);
              });
              return;
            }
            // For objects, flatten each key
            Object.keys(obj).forEach(key => {
              const newPrefix = prefix ? `${prefix}.${key}` : key;
              flattenDiff((obj as any)[key], newPrefix, result);
            });
          };

          // First, process items matched by key fields (these are modified, not added/removed)
          // This handles the common case where frontend sends items with new IDs but same identifying fields
          keyFieldsMatchedPairs.forEach((newId, oldId) => {
            processedOldIds.add(oldId);
            processedNewIds.add(newId);
            modified.push(oldId);
            
            // Compare to find actual field changes
            const oldItem = oldMap.get(oldId)!.item;
            const newItem = newMap.get(newId)!.item;
            const keys = _.uniq([...Object.keys(oldItem), ...Object.keys(newItem)]);
            
            keys.forEach(k => {
              if (k === '_id' || k === '__v' || k === 'id') return;
              
              const oldValue = (oldItem as any)[k];
              const newValue = (newItem as any)[k];
              
              if (!_.isEqual(oldValue, newValue)) {
                // Check if this is a nested object/array that should be flattened
                const isNestedObject = typeof oldValue === 'object' && oldValue !== null && !(oldValue instanceof Date);
                const isNestedArray = Array.isArray(oldValue) && oldValue.length > 0 && typeof oldValue[0] === 'object';
                const isNestedNew = typeof newValue === 'object' && newValue !== null && !(newValue instanceof Date);
                const isNestedArrayNew = Array.isArray(newValue) && newValue.length > 0 && typeof newValue[0] === 'object';
                
                if ((isNestedObject || isNestedArray) || (isNestedNew || isNestedArrayNew)) {
                  // Flatten nested objects/arrays for better diff display
                  const basePath = `${String(section)}[id:${oldId}].${k}`;
                  const oldFlattened: Record<string, any> = {};
                  const newFlattened: Record<string, any> = {};
                  
                  flattenDiff(oldValue, '', oldFlattened);
                  flattenDiff(newValue, '', newFlattened);
                  
                  // Add flattened diffs
                  const allKeys = _.uniq([...Object.keys(oldFlattened), ...Object.keys(newFlattened)]);
                  allKeys.forEach(flatKey => {
                    const flatOld = oldFlattened[flatKey];
                    const flatNew = newFlattened[flatKey];
                    if (!_.isEqual(flatOld, flatNew)) {
                      const path = flatKey ? `${basePath}.${flatKey}` : basePath;
                      (changes.diffData as any)[path] = {
                        old: flatOld,
                        new: flatNew
                      };
                    }
                  });
                } else {
                  // Simple value change
                  const path = `${String(section)}[id:${oldId}].${k}`;
                  (changes.diffData as any)[path] = {
                    old: oldValue,
                    new: newValue
                  };
                }
              }
            });
          });

          // Find modified items (same ID, different content)
          oldMap.forEach((oldData, id) => {
            if (processedOldIds.has(id)) return; // Already processed as content-matched
            
            const newData = newMap.get(id);
            if (newData && !_.isEqual(oldData.item, newData.item)) {
              processedOldIds.add(id);
              processedNewIds.add(id);
              modified.push(id);
              
              // Capture detailed field changes (only changed fields)
              const oldItem = oldData.item || {};
              const newItem = newData.item || {};
              const keys = _.uniq([...Object.keys(oldItem), ...Object.keys(newItem)]);
              // Helper to flatten nested objects (reuse from above)
              const flattenDiff = (obj: any, prefix: string, result: Record<string, any>): void => {
                if (obj === null || obj === undefined) {
                  result[prefix] = obj;
                  return;
                }
                if (typeof obj !== 'object' || obj instanceof Date) {
                  result[prefix] = obj;
                  return;
                }
                if (Array.isArray(obj)) {
                  if (obj.length === 0) {
                    result[prefix] = [];
                    return;
                  }
                  if (obj.every(item => typeof item !== 'object' || item === null)) {
                    result[prefix] = obj;
                    return;
                  }
                  obj.forEach((item, idx) => {
                    flattenDiff(item, `${prefix}[${idx}]`, result);
                  });
                  return;
                }
                Object.keys(obj).forEach(key => {
                  const newPrefix = prefix ? `${prefix}.${key}` : key;
                  flattenDiff((obj as any)[key], newPrefix, result);
                });
              };

              keys.forEach(k => {
                // Skip internal MongoDB fields
                if (k === '_id' || k === '__v' || k === 'id') return;
                
                const oldValue = (oldItem as any)[k];
                const newValue = (newItem as any)[k];
                
                if (!_.isEqual(oldValue, newValue)) {
                  // Check if this is a nested object/array that should be flattened
                  const isNestedObject = typeof oldValue === 'object' && oldValue !== null && !(oldValue instanceof Date);
                  const isNestedArray = Array.isArray(oldValue) && oldValue.length > 0 && typeof oldValue[0] === 'object';
                  const isNestedNew = typeof newValue === 'object' && newValue !== null && !(newValue instanceof Date);
                  const isNestedArrayNew = Array.isArray(newValue) && newValue.length > 0 && typeof newValue[0] === 'object';
                  
                  if ((isNestedObject || isNestedArray) || (isNestedNew || isNestedArrayNew)) {
                    // Flatten nested objects/arrays for better diff display
                    const basePath = `${String(section)}[id:${id}].${k}`;
                    const oldFlattened: Record<string, any> = {};
                    const newFlattened: Record<string, any> = {};
                    
                    flattenDiff(oldValue, '', oldFlattened);
                    flattenDiff(newValue, '', newFlattened);
                    
                    // Add flattened diffs
                    const allKeys = _.uniq([...Object.keys(oldFlattened), ...Object.keys(newFlattened)]);
                    allKeys.forEach(flatKey => {
                      const flatOld = oldFlattened[flatKey];
                      const flatNew = newFlattened[flatKey];
                      if (!_.isEqual(flatOld, flatNew)) {
                        const path = flatKey ? `${basePath}.${flatKey}` : basePath;
                        (changes.diffData as any)[path] = {
                          old: flatOld,
                          new: flatNew
                        };
                      }
                    });
                  } else {
                    // Simple value change
                    const path = `${String(section)}[id:${id}].${k}`;
                    (changes.diffData as any)[path] = {
                      old: oldValue,
                      new: newValue
                    };
                  }
                }
              });
            } else if (newData) {
              processedOldIds.add(id);
              processedNewIds.add(id);
            }
          });

          // Find added items (in new but not in old, and not matched by content)
          for (const id of newMap.keys()) {
            if (!processedNewIds.has(id)) {
              added.push(id);
              // For added items, only show key identifying fields, not full object
              const newItem = newMap.get(id)!.item;
              const keyFields = this.getKeyFieldsForSection(String(section), newItem);
              (changes.diffData as any)[`${String(section)}[+id:${id}]`] = {
                old: null,
                new: keyFields,
                _isAdded: true
              };
            }
          }

          // Find removed items (in old but not in new, and not matched by content)
          for (const id of oldMap.keys()) {
            if (!processedOldIds.has(id)) {
              removed.push(id);
              // For removed items, only show key identifying fields
              const oldItem = oldMap.get(id)!.item;
              const keyFields = this.getKeyFieldsForSection(String(section), oldItem);
              (changes.diffData as any)[`${String(section)}[-id:${id}]`] = {
                old: keyFields,
                new: null,
                _isRemoved: true
              };
            }
          }

          // Only mark as changed if there are actual changes
          if (added.length > 0 || removed.length > 0 || modified.length > 0) {
            (changes.details as any)[section] = { 
              added: added.length, 
              removed: removed.length, 
              modified: modified.length 
            };
            changes.sectionChanges!.push(String(section));
          }
        } catch (sectionError) {
          console.warn(`Error comparing section ${String(section)}:`, sectionError);
        }
      });

      // Compare simple fields (top-level fields we care about)
      let oldObj: any;
      let newObj: any;
      try {
        oldObj = typeof (oldTechPack as any).toObject === 'function' ? (oldTechPack as any).toObject() : oldTechPack;
        newObj = typeof (newTechPack as any).toObject === 'function' ? (newTechPack as any).toObject() : newTechPack;
      } catch (objError) {
        console.warn('Error converting techpack to object:', objError);
        oldObj = oldTechPack;
        newObj = newTechPack;
      }

      const simpleFields = [
        // All fields from Article Info that should be tracked
        'productName',
        'articleCode',
        'version',
        'supplier',
        'season',
        'fabricDescription',
        'productDescription',
        'gender',
        'productClass',
        'fitType',
        'lifecycleStage',
        'brand',
        'collectionName',  // Fixed: was 'collection', backend uses 'collectionName'
        'targetMarket',
        'pricePoint',
        'retailPrice',     // Added: missing field
        'currency',        // Added: missing field
        'description',     // Added: missing field (different from 'notes')
        'notes',
        'status',
        'designSketchUrl'
      ];

      const articleInfoChanges = this.compareSimpleFields(oldObj, newObj, simpleFields);
      if (Object.keys(articleInfoChanges).length > 0) {
        (changes.details as any)['articleInfo'] = { modified: Object.keys(articleInfoChanges).length };
        changes.sectionChanges!.push('articleInfo');
        // add to diffData
        Object.entries(articleInfoChanges).forEach(([field, diff]) => {
          (changes.diffData as any)[field] = { old: (diff as any).from, new: (diff as any).to };
        });
      }

      // Special handling for technicalDesignerId to compare by ID and show name
      const oldDesigner = oldObj.technicalDesignerId;
      const newDesigner = newObj.technicalDesignerId;
      const oldDesignerId = oldDesigner?._id?.toString() || oldDesigner;
      const newDesignerId = newDesigner?._id?.toString() || newDesigner;

      if (!_.isEqual(oldDesignerId, newDesignerId)) {
        changes.sectionChanges!.push('technicalDesigner');
        (changes.diffData as any)['technicalDesignerId'] = {
          old: oldDesigner?.fullName || oldDesignerId || 'N/A',
          new: newDesigner?.fullName || newDesignerId || 'N/A',
        };
        // Add to details for summary generation
        if (!(changes.details as any)['articleInfo']) {
          (changes.details as any)['articleInfo'] = { modified: 0 };
        }
        (changes.details as any)['articleInfo'].modified += 1;
      }

      // Generate a human-readable summary
      changes.summary = this.generateSummary(changes.details as Record<string, any>, changes.sectionChanges!);

    } catch (error) {
      console.error('Error in compareTechPacks:', error);
      changes.summary = 'Error detecting changes.';
    }

    return changes;
  }

  private compareSimpleFields(oldObj: any, newObj: any, fields: string[]): Record<string, any> {
    const changedFields: Record<string, any> = {};
    fields.forEach(field => {
      if (!_.isEqual(oldObj[field], newObj[field])) {
        changedFields[field] = { from: oldObj[field], to: newObj[field] };
      }
    });
    return changedFields;
  }

  private generateSummary(details: Record<string, any>, sectionChanges: string[]): string {
    const parts: string[] = [];
    for (const section in details) {
      const part = (details as any)[section];
      const changes: string[] = [];
      if (part.added) changes.push(`${part.added} added`);
      if (part.modified) changes.push(`${part.modified} modified`);
      if (part.removed) changes.push(`${part.removed} removed`);
      if (changes.length > 0) {
        parts.push(`${_.startCase(section)}: ${changes.join(', ')}`);
      }
    }
    if (parts.length === 0 && sectionChanges.length > 0) {
      return `Updated: ${sectionChanges.join(', ')}`;
    }
    return parts.join('. ') || 'Minor updates.';
  }

  /**
   * Get key identifying fields for a section item (for matching items with same identity)
   * These should be fields that uniquely identify an item and don't change when item is modified
   */
  private getKeyFieldsForMatching(section: string, item: any): any {
    const keyFields: any = {};
    
    switch (section) {
      case 'bom':
        // Use part + materialName as key (supplierCode can change, so don't include it)
        if (item.part) keyFields.part = item.part;
        if (item.materialName) keyFields.materialName = item.materialName;
        break;
      case 'measurements':
        // Use pomCode as primary key (pomName can change)
        if (item.pomCode) keyFields.pomCode = item.pomCode;
        break;
      case 'colorways':
        // Use name + code as key (placement can change)
        if (item.name) keyFields.name = item.name;
        if (item.code) keyFields.code = item.code;
        break;
      case 'howToMeasure':
        // Use pomCode + stepNumber as key
        if (item.pomCode) keyFields.pomCode = item.pomCode;
        if (item.stepNumber !== undefined) keyFields.stepNumber = item.stepNumber;
        break;
      default:
        // Fallback: use first non-ID field
        const keys = Object.keys(item).filter(k => k !== '_id' && k !== 'id' && k !== '__v').slice(0, 1);
        keys.forEach(k => {
          keyFields[k] = item[k];
        });
    }
    
    return keyFields;
  }

  /**
   * Get key identifying fields for a section item (for display in added/removed entries)
   * This includes more fields for better user visibility
   */
  private getKeyFieldsForSection(section: string, item: any): any {
    const keyFields: any = {};
    
    switch (section) {
      case 'bom':
        if (item.part) keyFields.part = item.part;
        if (item.materialName) keyFields.materialName = item.materialName;
        if (item.supplierCode) keyFields.supplierCode = item.supplierCode;
        break;
      case 'measurements':
        if (item.pomCode) keyFields.pomCode = item.pomCode;
        if (item.pomName) keyFields.pomName = item.pomName;
        break;
      case 'colorways':
        if (item.name) keyFields.name = item.name;
        if (item.code) keyFields.code = item.code;
        if (item.placement) keyFields.placement = item.placement;
        break;
      case 'howToMeasure':
        if (item.pomCode) keyFields.pomCode = item.pomCode;
        if (item.pomName) keyFields.pomName = item.pomName;
        if (item.stepNumber !== undefined) keyFields.stepNumber = item.stepNumber;
        break;
      default:
        // Fallback: include first few non-ID fields
        const keys = Object.keys(item).filter(k => k !== '_id' && k !== 'id' && k !== '__v').slice(0, 3);
        keys.forEach(k => {
          keyFields[k] = item[k];
        });
    }
    
    return keyFields;
  }
}

export default new RevisionService();




