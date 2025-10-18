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
      trackedArraySections.forEach(section => {
        try {
          const oldSection = ((oldTechPack as any)[section] as any[]) || [];
          const newSection = ((newTechPack as any)[section] as any[]) || [];

          if (!_.isEqual(oldSection, newSection)) {
            const added = Math.max(0, newSection.length - oldSection.length);
            const removed = Math.max(0, oldSection.length - newSection.length);

            // Rough modified estimation: items present in both positions but not deeply equal
            let modified = 0;
            const minLen = Math.min(oldSection.length, newSection.length);
            for (let i = 0; i < minLen; i++) {
              if (!_.isEqual(oldSection[i], newSection[i])) {
                modified += 1;
                // capture shallow field changes for index i
                const oldItem = oldSection[i] || {};
                const newItem = newSection[i] || {};
                const keys = _.uniq([...Object.keys(oldItem), ...Object.keys(newItem)]);
                keys.forEach(k => {
                  if (!_.isEqual((oldItem as any)[k], (newItem as any)[k])) {
                    const path = `${String(section)}[${i}].${k}`;
                    (changes.diffData as any)[path] = {
                      old: (oldItem as any)[k],
                      new: (newItem as any)[k]
                    };
                  }
                });
              }
            }

            (changes.details as any)[section] = { added, removed, modified };
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
        'collection',
        'targetMarket',
        'pricePoint',
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
}

export default new RevisionService();




