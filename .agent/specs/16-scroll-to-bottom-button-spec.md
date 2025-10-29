# Scroll-to-Bottom Button Feature Specification

## Overview
Implement an OpenAI-style scroll-to-bottom button that appears when the user scrolls up in the chat, positioned above the ChatPromptInput component.

## Architecture
Lift scroll state up to ProjectSession, which manages the button visibility and passes callbacks down to ChatInterface.

## Implementation Steps

### 1. Create ScrollToBottomButton Component
**New File:** `apps/web/src/client/pages/projects/sessions/components/ScrollToBottomButton.tsx`

```typescript
interface Props {
  visible: boolean;
  onClick: () => void;
}
```

**Features:**
- Circular button with `ArrowDown` icon from lucide-react
- Smooth fade in/out with Tailwind transitions
- Styling: White bg, shadow, hover effects
- Conditional rendering based on `visible` prop

### 2. Modify ChatInterface Component
**File:** `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx`

**Add to interface:**
```typescript
interface ChatInterfaceProps {
  // ... existing props
  onScrollStateChange?: (isNearBottom: boolean) => void;
}
```

**Add scroll detection:**
- Attach scroll event listener to `containerRef` (already exists)
- Threshold: Show button when >200px from bottom, hide when <100px from bottom
- Call `onScrollStateChange(isNearBottom)` when threshold crossed
- Debounce with simple flag to prevent excessive state updates

**Add public scroll method via ref:**
```typescript
export interface ChatInterfaceHandle {
  scrollToBottom: () => void;
}
```
- Use `forwardRef` and `useImperativeHandle`
- Expose `scrollToBottom` method that triggers `messagesEndRef.current.scrollIntoView()`

### 3. Modify ProjectSession Component
**File:** `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

**Add state and ref:**
```typescript
const [showScrollButton, setShowScrollButton] = useState(false);
const chatInterfaceRef = useRef<ChatInterfaceHandle>(null);
```

**Add handlers:**
```typescript
const handleScrollStateChange = (isNearBottom: boolean) => {
  setShowScrollButton(!isNearBottom);
};

const scrollToBottom = () => {
  chatInterfaceRef.current?.scrollToBottom();
};
```

**Update Chat Container (lines 332-344):**
```tsx
<div className="flex-1 overflow-hidden relative">
  <ChatInterface
    ref={chatInterfaceRef}
    onScrollStateChange={handleScrollStateChange}
    {/* ... existing props */}
  />

  <ScrollToBottomButton
    visible={showScrollButton}
    onClick={scrollToBottom}
  />
</div>
```

### 4. Button Positioning
- `absolute bottom-20 right-6` (positioned above input, considering mobile padding)
- `z-10` to stay above messages
- Responsive: Adjust for mobile screens (maybe `bottom-24 md:bottom-20`)

## Behavior Flow

1. **Initial Load:** ChatInterface starts at bottom → `onScrollStateChange(true)` → button hidden
2. **User scrolls up >200px:** `onScrollStateChange(false)` → button appears
3. **User scrolls near bottom <100px:** `onScrollStateChange(true)` → button disappears
4. **New message while scrolled up:** Auto-scroll skipped (existing logic), button stays visible
5. **Button clicked:** Calls `scrollToBottom()` → smooth scroll → triggers scroll event → button disappears

## User Requirements

### Scope
1. Attach to the ChatPromptInput positioned above it
2. When loading a session, it should start automatically scrolled all the way to the bottom
3. If new messages come in, or if user scrolls up, the arrow icon should show up
4. When pressed, it scrolls the user smoothly to the bottom and then the icon disappears
5. If user scrolls to the bottom themselves, once close to the bottom the arrow should disappear

## Files Changed

1. **New:** `apps/web/src/client/pages/projects/sessions/components/ScrollToBottomButton.tsx`
2. **Modified:** `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx`
3. **Modified:** `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

## Technical Details

- Use existing `containerRef` and `messagesEndRef` in ChatInterface
- Scroll detection via `addEventListener('scroll', handler)` with cleanup
- Simple threshold check to avoid excessive updates
- forwardRef pattern for ChatInterface to expose scroll method
- No new dependencies needed (lucide-react already installed)

## Layout Structure

```
ProjectSession (absolute inset-0 flex flex-col)
  ├─ ConnectionStatusBanner
  ├─ div.flex-1.overflow-hidden.relative (Chat Container) ← Button positioned here
  │   ├─ ChatInterface (scrollable pane with overflow-y-auto)
  │   └─ ScrollToBottomButton (absolute positioned)
  └─ div.md:pb-4.md:px-4 (Input Container)
      └─ ChatPromptInput
```

## Design Reference

See screenshot: `/Users/jnarowski/Library/Application Support/CleanShot/media/media_fqfqMLsqAt/CleanShot 2025-10-29 at 07.59.55@2x.png`

OpenAI-style circular button with down arrow, white background, subtle shadow, appears above input area.
