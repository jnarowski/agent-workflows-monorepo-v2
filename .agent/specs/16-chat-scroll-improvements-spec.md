# Specification: Chat Interface Scroll Improvements

**Status:** Planning
**Created:** 2025-10-29
**Priority:** High
**Complexity:** Medium

## Overview

Fix two scroll-related issues in the ChatInterface component:
1. Initial page load doesn't scroll all the way to the bottom
2. Missing "scroll to bottom" button when user scrolls up (like OpenAI ChatGPT)

## Problem Statement

### Issue 1: Incomplete Initial Scroll
**Current Behavior:**
When ChatInterface first loads, it scrolls "almost to the bottom but not all the way" - leaving ~20-40px of content hidden below the fold.

**Root Causes:**
1. **Smooth scroll animation gets interrupted**: Using `scrollIntoView({ behavior: "smooth" })` creates a 300-500ms animation. If new content renders during this animation (images loading, code blocks expanding, AgentLoadingIndicator mounting), the final scroll position becomes incorrect.

2. **`scrollIntoView` with `block: "end"` limitation**: This aligns the element to the end of the scroll container, but doesn't account for parent padding. The `.chat-container` has `py-8` (32px bottom padding) that's not considered in the calculation.

3. **`previousScrollHeight.current === 0` check timing**: This condition triggers on initial load, but `scrollHeight` is calculated before all content finishes rendering (images, syntax-highlighted code blocks, typewriter animations in AgentLoadingIndicator).

4. **Dynamic content after initial scroll**: When `isStreaming` prop changes, the `AgentLoadingIndicator` mounts/unmounts with a 50ms-per-character typewriter animation, changing scroll height after the initial scroll calculation completes.

**Expected Behavior:**
Page should scroll to the absolute bottom on initial load, with all content visible and no hidden messages.

### Issue 2: Missing Scroll-to-Bottom Button
**Current Behavior:**
When user manually scrolls up to read previous messages and new messages arrive, there's no easy way to jump back to the bottom. User must manually scroll all the way down.

**Expected Behavior:**
A "scroll to bottom" button (like OpenAI ChatGPT) should appear when:
- User has scrolled up more than 100px from bottom
- New messages arrive while user is scrolled up

Button should:
- Hide when user is near bottom (< 100px)
- Hide when clicked
- Smoothly animate scroll when activated
- Be positioned at bottom-center of chat container
- Include ChevronDown icon + "Scroll to bottom" text

## Technical Analysis

### Current Implementation (ChatInterface.tsx:46-64)

```typescript
useEffect(() => {
  if (!containerRef.current || !messagesEndRef.current) return;

  const container = containerRef.current;
  const isNearBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight < 200;

  // Only auto-scroll if user is already near the bottom
  if (isNearBottom || previousScrollHeight.current === 0) {
    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  previousScrollHeight.current = container.scrollHeight;
}, [messages]);
```

**Problems:**
- ❌ Uses `scrollIntoView` which aligns to element, not absolute bottom
- ❌ Smooth animation can be interrupted by content changes
- ❌ No distinction between initial load and subsequent updates
- ❌ 200px threshold may be too large for "near bottom" detection
- ❌ No scroll position tracking for button visibility

### Better Approach (from ai-elements/conversation.tsx:24-44)

The existing `conversation.tsx` component uses a simpler, more reliable pattern:

```typescript
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [children]);
```

**Benefits:**
- ✅ Direct `scrollTop` assignment (instantaneous, accurate)
- ✅ Always scrolls to exact bottom (`scrollTop = scrollHeight`)
- ✅ No animation to be interrupted
- ✅ Simple and predictable

## Proposed Solution

### 1. Fix Initial Scroll Behavior

**Changes to auto-scroll useEffect:**

```typescript
const isInitialLoadRef = useRef(true);

useEffect(() => {
  if (!containerRef.current || !messagesEndRef.current) return;

  const container = containerRef.current;
  const isNearBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight < 100;

  // Special handling for initial load
  if (isInitialLoadRef.current && messages.length > 0) {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
    isInitialLoadRef.current = false;
    previousScrollHeight.current = container.scrollHeight;
    return;
  }

  // Auto-scroll only if user is near bottom (preserve manual scroll position)
  if (isNearBottom) {
    container.scrollTop = container.scrollHeight;
  }

  previousScrollHeight.current = container.scrollHeight;
}, [messages]);
```

**Key Improvements:**
1. **`isInitialLoadRef` tracking**: Distinguishes first load from subsequent message updates
2. **`requestAnimationFrame` delay**: Ensures DOM is fully rendered before measuring/scrolling
3. **Direct `scrollTop` assignment**: Instant, accurate, not interrupted by content changes
4. **No smooth animation on initial load**: Prevents race conditions with dynamic content
5. **Reduced threshold**: Changed from 200px to 100px for more precise "near bottom" detection

### 2. Add Scroll-to-Bottom Button

**New state and handlers:**

```typescript
const [showScrollButton, setShowScrollButton] = useState(false);

// Track scroll position for button visibility
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
  };

  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, []);

// Scroll to bottom handler
const scrollToBottom = () => {
  if (!containerRef.current) return;

  containerRef.current.scrollTo({
    top: containerRef.current.scrollHeight,
    behavior: 'smooth',
  });
};
```

**Button UI (in JSX):**

```typescript
{showScrollButton && (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
    <Button
      onClick={scrollToBottom}
      size="sm"
      variant="secondary"
      className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
    >
      <ChevronDown className="h-4 w-4 mr-1" />
      Scroll to bottom
    </Button>
  </div>
)}
```

**Positioning Details:**
- `absolute` positioning (relative to parent with `relative` class)
- `bottom-4` (16px from bottom)
- `left-1/2 -translate-x-1/2` (centered horizontally)
- `z-10` (appears above message content)
- `rounded-full` (pill shape like ChatGPT)
- `shadow-lg` with `hover:shadow-xl` (depth and interaction feedback)

## Implementation Plan

### Phase 1: Add Imports and State
**File:** `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx`

1. Add imports:
   - `useState` from React
   - `ChevronDown` from lucide-react
   - `Button` from `@/client/components/ui/button`

2. Add state variables:
   ```typescript
   const [showScrollButton, setShowScrollButton] = useState(false);
   const isInitialLoadRef = useRef(true);
   ```

### Phase 2: Improve Auto-Scroll Logic
**File:** Same as above

1. Replace existing auto-scroll useEffect (lines 46-64) with improved version
2. Add initial load detection with `isInitialLoadRef`
3. Use `requestAnimationFrame` for initial scroll
4. Change to direct `scrollTop` assignment
5. Reduce "near bottom" threshold from 200px to 100px

### Phase 3: Add Scroll Position Tracking
**File:** Same as above

1. Add new useEffect for scroll event listener
2. Calculate distance from bottom on scroll
3. Update `showScrollButton` state based on threshold (100px)
4. Clean up event listener on unmount

### Phase 4: Add Scroll-to-Bottom Handler
**File:** Same as above

1. Add `scrollToBottom` function
2. Use `scrollTo` with smooth behavior
3. Called by button click

### Phase 5: Render Button UI
**File:** Same as above

1. Add button component inside scroll container (after `.chat-container`)
2. Position absolutely at bottom-center
3. Conditionally render based on `showScrollButton` state
4. Add ChevronDown icon and label text

## Files Modified

### Primary Changes
- `/apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx`
  - Add imports: `useState`, `ChevronDown`, `Button`
  - Add state: `showScrollButton`, `isInitialLoadRef`
  - Improve auto-scroll useEffect (initial load handling)
  - Add scroll tracking useEffect
  - Add `scrollToBottom` handler
  - Render scroll button conditionally

### Dependencies (Already Available)
- ✅ `useState` - React core
- ✅ `ChevronDown` - lucide-react (already imported in component)
- ✅ `Button` - @/client/components/ui/button (shadcn/ui)
- ✅ `requestAnimationFrame` - Browser API

## Testing Plan

### Manual Testing

1. **Initial Scroll Test:**
   - Open ChatInterface with existing messages
   - Verify page scrolls to absolute bottom (no hidden content)
   - Test with different message counts (1, 10, 50+ messages)
   - Test with images, code blocks, and long messages

2. **Scroll Button Visibility Test:**
   - Scroll to bottom → button should be hidden
   - Scroll up 50px → button should remain hidden
   - Scroll up 150px → button should appear
   - Scroll back to bottom → button should disappear

3. **Scroll Button Interaction Test:**
   - Scroll up 200px
   - Click "Scroll to bottom" button
   - Verify smooth scroll animation
   - Verify button disappears when reaching bottom

4. **Auto-Scroll Behavior Test:**
   - Scroll to bottom → new message arrives → auto-scroll to bottom
   - Scroll up 200px → new message arrives → stay at current position
   - Scroll to bottom manually → button should hide

5. **Streaming Message Test:**
   - Start new chat session
   - Send message to agent
   - Verify auto-scroll during streaming
   - Scroll up mid-stream → button appears
   - Verify scroll position preserved during streaming when scrolled up

### Edge Cases

1. **Empty chat:** No button when no messages
2. **Single message:** Initial scroll should work correctly
3. **Rapid message updates:** Button state should update correctly
4. **Browser resize:** Scroll position and button visibility should recalculate
5. **Images loading late:** Initial scroll should handle dynamic content height changes

## Success Criteria

1. ✅ Initial page load scrolls to absolute bottom (0px hidden content)
2. ✅ Scroll-to-bottom button appears when scrolled up > 100px
3. ✅ Button hides when at bottom or clicked
4. ✅ Button click smoothly scrolls to bottom
5. ✅ Auto-scroll preserved (only when user is near bottom)
6. ✅ Manual scroll position preserved when new messages arrive
7. ✅ No performance issues (smooth 60fps scrolling)
8. ✅ Works with streaming messages
9. ✅ Works with dynamic content (images, code blocks)
10. ✅ Matches OpenAI ChatGPT UX patterns

## Risks and Mitigations

### Risk 1: `requestAnimationFrame` timing issues
**Mitigation:** Fallback to `setTimeout(0)` if RAF causes issues. Can also add double RAF for extra safety: `requestAnimationFrame(() => requestAnimationFrame(...))`

### Risk 2: Scroll button flickering during rapid updates
**Mitigation:** Debounce scroll event handler if needed (use `lodash.debounce` or custom debounce)

### Risk 3: Button interferes with chat interaction
**Mitigation:** Use `z-10` (high z-index) and `pointer-events-auto` to ensure button is clickable. Position at bottom-center to avoid message text.

### Risk 4: Performance with many messages
**Mitigation:** Current implementation is O(1) for scroll operations. Scroll event listener is passive. No performance impact expected.

## Future Enhancements

1. **Unread message count**: Show number of new messages in button (e.g., "↓ 3 new messages")
2. **Smooth auto-scroll option**: Add user preference for smooth vs instant auto-scroll
3. **Keyboard shortcut**: Add Cmd/Ctrl + End to scroll to bottom
4. **Scroll position persistence**: Remember scroll position when switching sessions
5. **Jump to specific message**: Click message in sidebar to scroll to it

## References

- **Related component:** `ai-elements/conversation.tsx` (lines 24-44)
- **UI pattern reference:** OpenAI ChatGPT scroll-to-bottom button
- **Browser API:** `Element.scrollIntoView()`, `Element.scrollTo()`, `requestAnimationFrame()`
- **Similar patterns:** Slack, Discord (jump to present), Twitter (load new tweets button)

## Notes

- This spec addresses user-reported issues from screenshot showing partial scroll
- Implementation is low-risk (non-breaking changes to single component)
- No backend changes required
- No database migrations required
- No new dependencies required
- Estimated implementation time: 1-2 hours
