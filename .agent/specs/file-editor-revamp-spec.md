# File Browser Simplification Spec

## Overview
Simplify the file browser to use a **single, clean display mode** with expandable file trees and modal file viewing/editing, matching claudecodeui's functionality.

## Key Changes

### 1. **Remove Multiple View Modes**
- Remove `simple`, `compact`, and `detailed` view mode toggles
- Keep only a **clean single view** (similar to claudecodeui's simple mode)
- Remove view mode toggle buttons and localStorage persistence
- Remove `DetailedFileTreeItem` and `FileTreeItemComponent` - use single component

### 2. **Fix File Tree Expansion**
- Use proper `Collapsible` component from shadcn/ui (already imported but not working correctly)
- Implement working expand/collapse for directories with chevron rotation
- Maintain expanded state properly in the component

### 3. **Add File Editor Modal**
- Create `FileEditor.tsx` modal component using shadcn/ui Dialog
- Use **CodeMirror** for code editing with syntax highlighting (like claudecodeui)
- Support multiple languages (JS, TS, Python, HTML, CSS, JSON, Markdown, etc.)
- Add **Save functionality** with API integration
- Support image files with separate ImageViewer component
- Display file metadata (name, size, path)
- Add fullscreen mode toggle
- Show save success feedback

### 4. **API Endpoints**
- Add `GET /api/projects/:id/files/content?path=...` - fetch file contents
- Add `POST /api/projects/:id/files/content` - save file contents

### 5. **Clean Design**
- Simplify header: Just search bar (no view mode buttons)
- Use consistent icon colors (blue for folders, colored by file type)
- Remove grid layouts and column headers
- Clean, flat design with proper hover states
- Modal with proper close button and save button

### 6. **Implementation Steps**
1. Add CodeMirror dependencies to package.json
2. Create `FileEditor.tsx` modal component with CodeMirror integration
3. Create `ImageViewer.tsx` modal component
4. Add API endpoints for file read/write in server
5. Rewrite `FileTree.tsx` with single view mode
6. Add proper Collapsible functionality for directories
7. Test with browser automation

### 7. **E2E Testing with Playwright**
Use `/use-browser` command to verify complete implementation:

**Test Steps:**
1. Navigate to files page and verify UI loads
2. **Test File Tree Expansion:**
   - Click on a folder to expand it
   - Verify chevron rotates and children appear
   - Click again to collapse
   - Verify children hide
3. **Test Search Functionality:**
   - Type a search query
   - Verify filtered results appear
   - Verify matching folders auto-expand
   - Clear search and verify full tree returns
4. **Test File Editor:**
   - Click on a text/code file
   - Verify modal opens with file content
   - Verify syntax highlighting works
   - Edit the file content
   - Click Save button
   - Verify save success message
   - Close and reopen file to verify changes persisted
5. **Test Image Viewer:**
   - Click on an image file (png, jpg, etc.)
   - Verify image viewer modal opens
   - Verify image displays correctly
6. **Test Modal Close:**
   - Verify X button closes modal
   - Verify clicking outside modal closes it
7. **Verify No Console Errors:**
   - Check browser console for errors throughout testing

## Reference Implementation
- **claudecodeui FileTree**: `/apps/claudecodeui/src/components/FileTree.jsx`
- **claudecodeui CodeEditor**: `/apps/claudecodeui/src/components/CodeEditor.jsx`
- **claudecodeui ImageViewer**: `/apps/claudecodeui/src/components/ImageViewer.jsx`

## Files to Modify
- `apps/web/src/client/components/files/FileTree.tsx` - Simplify to single view mode
- `apps/web/src/server/routes/projects.ts` - Add file content endpoints
- `apps/web/src/server/services/file.service.ts` - Add file read/write methods
- `apps/web/package.json` - Add CodeMirror dependencies

## Files to Create
- `apps/web/src/client/components/files/FileEditor.tsx` - New file editor modal
- `apps/web/src/client/components/files/ImageViewer.tsx` - New image viewer modal
