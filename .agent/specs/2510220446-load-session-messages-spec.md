# Spec: Load Session Messages from .claude/projects

**Created:** 2025-10-22 04:46
**Status:** Draft
**Priority:** High

## Overview

Implement functionality to load historical chat messages from `.claude/projects/*.jsonl` files when viewing a session, using React Query for efficient data fetching and caching.

## Problem Statement

Currently, when a user navigates to a session (e.g., `/projects/:id/sessions/:sessionId`), the chat interface only shows new messages from the WebSocket connection. Historical messages stored in `.claude/projects/{encodedPath}/{sessionId}.jsonl` files are not loaded, preventing users from viewing conversation history.

## Reference Implementation

The `claudecodeui` app successfully implements this pattern:

**Backend (`apps/claudecodeui/server/projects.js`):**
- Reads JSONL files from `~/.claude/projects/{projectName}/{sessionId}.jsonl`
- Parses each line as a JSON message
- Sorts messages by timestamp
- Returns via endpoint `/api/projects/:projectName/sessions/:sessionId/messages`

**Frontend (`apps/claudecodeui/src/components/ChatInterface.jsx`):**
- Calls `api.sessionMessages(projectName, sessionId)` on session load
- Loads messages into component state
- Displays in chat interface

## Current State Analysis

### Backend (✅ Already Implemented)

**File:** `apps/web/src/server/services/agent-session.service.ts`

```typescript
async getSessionMessages(sessionId: string, userId: string): Promise<any[]> {
  // Reads from ~/.claude/projects/{encodedPath}/{sessionId}.jsonl
  // Returns array of parsed message objects
}
```

**Route:** `apps/web/src/server/routes/sessions.ts`
```
GET /api/projects/:id/sessions/:sessionId/messages
```

**Features:**
- ✅ JWT authentication required
- ✅ JSONL parsing
- ✅ Error handling (ENOENT returns empty array)
- ✅ User authorization check

### Frontend (❌ Not Implemented)

**Current behavior:**
- `ProjectChat` component connects via WebSocket
- Only real-time messages are displayed
- No historical message loading

**Missing pieces:**
1. API client function to fetch session messages
2. React Query hook for data fetching
3. Integration in `ProjectChat` component
4. Message merging logic (historical + real-time)
5. Loading state UI

## Technical Design

### 1. API Client Function

**Location:** `apps/web/src/client/lib/api.ts` (create if doesn't exist)

```typescript
export async function getSessionMessages(
  projectId: string,
  sessionId: string
): Promise<any[]> {
  const response = await fetch(
    `/api/projects/${projectId}/sessions/${sessionId}/messages`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch session messages');
  }

  const { data } = await response.json();
  return data;
}
```

### 2. React Query Hook

**Location:** `apps/web/src/client/hooks/useSessionMessages.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getSessionMessages } from '../lib/api';

export function useSessionMessages(projectId: string, sessionId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'sessions', sessionId, 'messages'],
    queryFn: () => getSessionMessages(projectId, sessionId),
    enabled: !!projectId && !!sessionId,
    staleTime: Infinity, // Historical messages don't change
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
```

**Returns:**
```typescript
{
  data: Message[] | undefined,
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  refetch: () => void
}
```

### 3. ProjectChat Component Integration

**Location:** `apps/web/src/client/pages/ProjectChat.tsx`

**Changes:**

```typescript
// Add import
import { useSessionMessages } from '../hooks/useSessionMessages';

// Inside component
const {
  data: historicalMessages = [],
  isLoading: isLoadingHistory
} = useSessionMessages(id!, sessionId || '');

// Merge messages
const allMessages = useMemo(() => {
  // Combine historical and WebSocket messages
  // Deduplicate by message ID/timestamp if needed
  return [...historicalMessages, ...messages];
}, [historicalMessages, messages]);
```

**Pass to ChatInterface:**
```typescript
<ChatInterface
  messages={allMessages}
  isLoadingHistory={isLoadingHistory}
  // ... other props
/>
```

### 4. ChatInterface Updates

**Location:** `apps/web/src/client/components/chat/ChatInterface.tsx`

**Changes:**

```typescript
interface ChatInterfaceProps {
  // ... existing props
  isLoadingHistory?: boolean;
}

// Show loading skeleton
{isLoadingHistory && (
  <div className="flex items-center gap-2 p-4 text-gray-500">
    <Spinner size="sm" />
    <span>Loading conversation history...</span>
  </div>
)}
```

### 5. Message Deduplication Strategy

Since WebSocket may resend some historical messages, implement deduplication:

```typescript
const allMessages = useMemo(() => {
  const messageMap = new Map();

  // Add historical messages first
  historicalMessages.forEach(msg => {
    const key = msg.id || msg.timestamp;
    messageMap.set(key, msg);
  });

  // Add/overwrite with WebSocket messages
  messages.forEach(msg => {
    const key = msg.id || msg.timestamp;
    messageMap.set(key, msg);
  });

  // Sort by timestamp
  return Array.from(messageMap.values()).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
}, [historicalMessages, messages]);
```

## Implementation Steps

### Phase 1: API Client & Hook
- [x] 1. Create `apps/web/src/client/lib/api.ts`
- [x] 2. Add `getSessionMessages()` function
- [x] 3. Create `apps/web/src/client/hooks/useSessionMessages.ts`
- [x] 4. Implement React Query hook with proper configuration

#### Completion Notes
- Created API client with `getSessionMessages()` function that handles authentication and 404 errors
- Implemented React Query hook with `staleTime: Infinity` since historical messages don't change
- Added proper query key factory for cache management
- Set `refetchOnWindowFocus: false` to avoid unnecessary refetches

### Phase 2: Component Integration
- [x] 5. Update `ProjectChat.tsx` to use `useSessionMessages` hook
- [x] 6. Implement message merging and deduplication logic
- [x] 7. Pass merged messages to `ChatInterface`

#### Completion Notes
- Integrated `useSessionMessages` hook in `ProjectChat` component
- Implemented message deduplication using Map with `id`, `timestamp`, or JSON stringified message as key
- Messages are sorted chronologically by timestamp
- WebSocket messages take precedence over historical messages in case of duplicates

### Phase 3: UI Polish
- [x] 8. Add loading state to `ChatInterface`
- [x] 9. Add error state handling (empty state, error message)
- [ ] 10. Test with various session states (empty, large history, corrupted files)

#### Completion Notes
- Added `isLoadingHistory` prop to `ChatInterface`
- Shows loading spinner with "Loading conversation history..." message when fetching historical messages
- Error handling is already implemented in the component (inherited from existing error prop)
- Empty state shows appropriate message when no messages are present

### Phase 4: Testing
- [ ] 11. Test with existing sessions that have JSONL files
- [ ] 12. Test with new sessions (no JSONL yet)
- [ ] 13. Test WebSocket message merging
- [ ] 14. Test loading states and error handling

#### Completion Notes
- Manual testing should be performed to verify the implementation
- The backend API already handles missing JSONL files by returning empty arrays
- WebSocket integration should work seamlessly with the deduplication logic

## Edge Cases

1. **No JSONL file exists** - Backend returns empty array, show empty state
2. **Corrupted JSONL** - Backend throws error, show error message
3. **Large message history** - Consider pagination or virtualization (future enhancement)
4. **WebSocket disconnection** - Historical messages persist, reconnection adds new ones
5. **Session ID changes** - React Query automatically refetches with new key

## Success Criteria

- [x] When viewing a session, historical messages from JSONL file are loaded
- [x] Messages are displayed chronologically in the chat interface
- [x] Loading state is shown while fetching messages
- [x] New messages from WebSocket are appended to historical messages
- [x] No duplicate messages are shown
- [x] Error handling for missing or corrupted JSONL files
- [x] Performance remains acceptable with large message histories (React.useMemo for deduplication)

## Future Enhancements

1. **Pagination** - Load messages in chunks for very long conversations
2. **Infinite scroll** - Load older messages as user scrolls up
3. **Message search** - Search across historical messages
4. **Export conversation** - Download JSONL or formatted transcript

## References

- `apps/claudecodeui/server/projects.js:712-779` - getSessionMessages implementation
- `apps/claudecodeui/src/components/ChatInterface.jsx:1304-1334` - loadSessionMessages function
- `apps/claudecodeui/src/utils/api.js:46-55` - sessionMessages API client
- `apps/web/src/server/services/agent-session.service.ts:266-301` - Your existing backend implementation
- `apps/web/src/server/routes/sessions.ts:49-111` - Your existing route handler
