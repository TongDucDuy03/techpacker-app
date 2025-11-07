import RevisionService from '../services/revision.service';

describe('RevisionService.compareTechPacks', () => {
  test('detects added and removed bom items using id/_id', () => {
    const oldTP: any = {
      bom: [
        { _id: 'a1', part: 'Button', materialName: 'Plastic', size: 'S' },
        { id: 'b2', part: 'Thread', materialName: 'Nylon', size: 'M' }
      ],
      productName: 'Shirt'
    };

    const newTP: any = {
      bom: [
        { _id: 'a1', part: 'Button', materialName: 'Plastic', size: 'S' },
        { id: 'c3', part: 'Label', materialName: 'Polyester', size: 'XS' }
      ],
      productName: 'Shirt updated'
    };

    const changes = RevisionService.compareTechPacks(oldTP, newTP);
    expect(changes.details).toHaveProperty('bom');
    const bomDetails = (changes.details as any).bom;
    expect(bomDetails.added).toBe(1);
    expect(bomDetails.removed).toBe(1);
    // productName changed
    expect((changes.details as any).articleInfo.modified).toBeGreaterThanOrEqual(1);
  });

  test('detects modified fields on bom items', () => {
    const oldTP: any = {
      bom: [{ _id: 'x1', part: 'Zipper', materialName: 'Metal', size: 'L' }]
    };
    const newTP: any = {
      bom: [{ _id: 'x1', part: 'Zipper', materialName: 'Plastic', size: 'L' }]
    };

    const changes = RevisionService.compareTechPacks(oldTP, newTP);
    expect(changes.details).toHaveProperty('bom');
    const bomDetails = (changes.details as any).bom;
    expect(bomDetails.modified).toBe(1);
    // diffData should include the changed field
    const diffKeys = Object.keys(changes.diffData || {});
    expect(diffKeys.some(k => k.includes('materialName'))).toBe(true);
  });
});
