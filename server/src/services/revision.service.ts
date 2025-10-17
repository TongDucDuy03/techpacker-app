import { ITechPack } from '../models/techpack.model';
import { IRevisionChange } from '../models/revision.model';
import _ from 'lodash';

class RevisionService {
  /**
   * Compares two versions of a TechPack and generates a summary of changes.
   * @param oldTechPack The old version of the TechPack.
   * @param newTechPack The new version of the TechPack.
   * @returns An IRevisionChange object summarizing the differences.
   */
  public compareTechPacks(oldTechPack: ITechPack, newTechPack: ITechPack): IRevisionChange {
    const changes: IRevisionChange = {
      summary: '',
      details: {},
    };

    const trackedSections: (keyof ITechPack)[] = ['bom', 'measurements', 'colorways', 'howToMeasure'];

    // Compare array-based sections (BOM, Measurements, etc.)
    trackedSections.forEach(section => {
      const oldSection = oldTechPack[section] as any[];
      const newSection = newTechPack[section] as any[];

      if (!_.isEqual(oldSection, newSection)) {
        const added = _.differenceBy(newSection, oldSection, '_id').length;
        const removed = _.differenceBy(oldSection, newSection, '_id').length;
        const modified = newSection.length - added;

        changes.details[section] = { added, removed, modified: modified > 0 ? modified : 0 };
      }
    });

    // Compare simple fields in articleInfo
    const articleInfoChanges = this.compareSimpleFields(
        (oldTechPack as any).toObject(), 
        (newTechPack as any).toObject(), 
        ['productName', 'articleCode', 'version', 'supplier', 'season', 'fabricDescription', 'productDescription', 'designSketchUrl']
    );

    if (Object.keys(articleInfoChanges).length > 0) {
        changes.details['articleInfo'] = { modified: Object.keys(articleInfoChanges).length };
    }

    // Generate a human-readable summary
    changes.summary = this.generateSummary(changes.details);

    return changes;
  }

  /**
   * Compares simple key-value fields between two objects.
   * @param oldObj The old object.
   * @param newObj The new object.
   * @param fields The fields to compare.
   * @returns A record of changed fields.
   */
  private compareSimpleFields(oldObj: any, newObj: any, fields: string[]): Record<string, any> {
    const changedFields: Record<string, any> = {};
    fields.forEach(field => {
      if (!_.isEqual(oldObj[field], newObj[field])) {
        changedFields[field] = { from: oldObj[field], to: newObj[field] };
      }
    });
    return changedFields;
  }

  /**
   * Generates a human-readable summary from the change details.
   * @param details The change details.
   * @returns A summary string.
   */
  private generateSummary(details: Record<string, any>): string {
    const summaryParts: string[] = [];
    for (const section in details) {
      const part = details[section];
      const changes: string[] = [];
      if (part.added) changes.push(`${part.added} added`);
      if (part.modified) changes.push(`${part.modified} modified`);
      if (part.removed) changes.push(`${part.removed} removed`);
      if (changes.length > 0) {
        summaryParts.push(`${_.startCase(section)}: ${changes.join(', ')}`);
      }
    }
    return summaryParts.join('. ') || 'Minor updates.';
  }
}

export default new RevisionService();

