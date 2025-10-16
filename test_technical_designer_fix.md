# Technical Designer Field Fix - Test Plan

## Bug Description
The Technical Designer field in the Article Info tab was not persisting when saved due to the `handleSave` function passing the original `techPack` object instead of the current form state.

## Root Cause
In `ArticleInfoTab.tsx`, the `handleSave` function was calling:
```typescript
onUpdate?.(techPack ?? {}); // ❌ Original data, overwrites real-time updates
```

Instead of:
```typescript
onUpdate?.({ 
  ...techPack, 
  articleInfo: safeArticleInfo  // ✅ Current form state with updates
});
```

## Fix Applied
1. **Fixed `handleSave` function** - Now passes current form state with updated `articleInfo`
2. **Fixed `handleNextTab` function** - Ensures form state is saved before tab navigation
3. **Verified backend compatibility** - Backend correctly handles `technicalDesignerId` in whitelist

## Test Steps
1. Open Article Info tab
2. Select a Technical Designer from dropdown
3. Click "Save Draft" button
4. Verify the selection persists in the UI
5. Refresh the page (if in edit mode)
6. Confirm the Technical Designer selection is still present

## Expected Behavior
- Technical Designer selection should persist after clicking "Save Draft"
- Selection should remain when navigating between tabs
- Data should be correctly sent to backend with `technicalDesignerId` field
- No console errors should occur during the save process

## Backend Verification
✅ Backend `patchTechPack` method includes `technicalDesignerId` in allowed fields
✅ Field is properly processed and saved to database
✅ TechPack context correctly maps the field in `saveTechPack` function
