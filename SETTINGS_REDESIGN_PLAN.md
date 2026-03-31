# ProfitPath Settings Menu Redesign

## Problem Statement
The current settings menu is confusing and doesn't properly implement progressive disclosure. Users can't understand what each setting does or which experience level they're at.

## Proposed Solution

### Experience Levels
- **Beginner**: Basic calculations, simple exports, tooltips enabled
- **Intermediate**: Advanced calculations, detailed breakdowns, comparison tools, all exports  
- **Advanced**: All features including debug panel, analytics dashboard

### Settings Structure

#### 1. Experience Level Selector (Top)
- Dropdown to choose experience level
- Shows current level
- Saves to localStorage

#### 2. Level-Appropriate Features

**Beginner:**
- ✅ Basic calculations (always visible)
- ✅ Simple exports (CSV, HTML)
- ✅ Tooltips enabled
- ❌ Advanced calculations (hidden)
- ❌ Detailed breakdowns (hidden)
- ❌ Comparison tools (hidden)
- ❌ Debug panel (hidden)
- ❌ Analytics dashboard (hidden)

**Intermediate:**
- ✅ All calculations (always visible)
- ✅ All exports (CSV, HTML, PDF, Excel)
- ✅ Tooltips enabled
- ✅ Advanced calculations (visible)
- ✅ Detailed breakdowns (visible)
- ✅ Comparison tools (visible)
- ❌ Debug panel (hidden)
- ❌ Analytics dashboard (hidden)

**Advanced:**
- ✅ All features visible
- ✅ Debug panel (controllable)
- ✅ Analytics dashboard (controllable)

#### 3. Clear Feature Descriptions

Each setting should have:
- Clear purpose statement
- What it enables/disables
- Which experience levels it's available in

#### 4. Implementation Plan

1. Add experience level selector to settings modal
2. Restructure settings by experience level
3. Update progressive disclosure to respect level selector
4. Add clear descriptions and tooltips
5. Test all three levels work correctly

## Benefits
- **Clear user understanding** of what each level provides
- **Proper progressive disclosure** - features unlock as users advance
- **Simplified settings** - less overwhelming for beginners
- **Better UX** - settings grouped by level and purpose

## Files to Modify
- `index.html` - Add experience level selector
- `app.jsx` - Add level management logic
- `assets/utils/progressiveDisclosure.js` - Update to use level selector
- `assets/styles.css` - Add styles for level selector
- All settings files - Update to respect experience levels

## Testing Strategy
- Test each experience level shows/hides correct features
- Test level changes persist across sessions
- Test progressive disclosure works properly
- Add integration tests for settings menu
