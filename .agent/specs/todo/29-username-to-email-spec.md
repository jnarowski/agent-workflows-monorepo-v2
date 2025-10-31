# Username to Email Authentication Migration

**Status**: draft
**Created**: 2025-10-31
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Migrate the authentication system from username-based to email-based login. This involves updating the database schema, backend API routes, validation schemas, JWT payload structure, and all frontend authentication forms to use email instead of username for user identification and login.

## User Story

As a user of the Agent Workflows application
I want to log in using my email address instead of a username
So that authentication follows standard web conventions and is more intuitive

## Technical Approach

This is a comprehensive refactor that touches all layers of the authentication system:
1. **Database**: Replace `username` field with `email` in the User model
2. **Backend**: Update all authentication routes, validation schemas, and JWT payload
3. **Frontend**: Modify login/signup forms and state management to use email
4. **Migration**: Reset database (fresh start) - no data migration needed

The implementation will maintain the existing single-user system design and JWT-based authentication architecture.

## Key Design Decisions

1. **Complete Username Removal**: Replace username entirely with email - no dual fields. Email will serve as both the unique identifier and display field.
2. **JWT Payload Contains Email Only**: JWT tokens will contain `{ userId, email }` instead of `{ userId, username }` for consistency.
3. **Database Reset Strategy**: Delete existing database and create fresh migration rather than migrating data. This is acceptable for a development/single-user system.
4. **Email Validation**: Add proper email format validation using Zod's `.email()` validator on both frontend and backend.

## Architecture

### File Structure

```
apps/web/
├── prisma/
│   └── schema.prisma              # User model: username → email
├── src/
│   ├── server/
│   │   ├── schemas/
│   │   │   └── auth.ts            # Validation: username → email
│   │   ├── routes/
│   │   │   └── auth.ts            # Auth endpoints: username → email
│   │   ├── plugins/
│   │   │   └── auth.ts            # JWT verification: username → email
│   │   └── utils/
│   │       └── auth.ts            # JWTPayload: username → email
│   └── client/
│       ├── stores/
│       │   └── authStore.ts       # User interface & methods
│       └── pages/
│           └── auth/
│               ├── Login.tsx      # Login page state
│               ├── Signup.tsx     # Signup page state
│               └── components/
│                   ├── LoginForm.tsx   # Login form UI
│                   └── SignupForm.tsx  # Signup form UI
```

### Integration Points

**Authentication System**:
- `prisma/schema.prisma` - Database model definition
- `server/schemas/auth.ts` - Input validation schemas
- `server/routes/auth.ts` - Login, register, and user endpoints
- `server/plugins/auth.ts` - JWT verification middleware
- `server/utils/auth.ts` - JWT payload type definition

**Frontend**:
- `client/stores/authStore.ts` - Auth state management
- `client/pages/auth/Login.tsx` - Login page logic
- `client/pages/auth/Signup.tsx` - Signup page logic
- `client/pages/auth/components/LoginForm.tsx` - Login form UI
- `client/pages/auth/components/SignupForm.tsx` - Signup form UI

## Implementation Details

### 1. Database Schema Changes

Update the Prisma User model to replace the `username` field with `email`:
- Change field name from `username` to `email`
- Keep `@unique` constraint (email must be unique)
- Maintain all other fields (id, password_hash, created_at, last_login, is_active)

**Key Points**:
- Email will be the unique identifier for login
- The `@unique` constraint ensures no duplicate emails
- All relationships (AgentSession) remain unchanged

### 2. Backend Validation Schemas

Update Zod schemas in `server/schemas/auth.ts`:
- Replace `username` field with `email` in both `registerSchema` and `loginSchema`
- Add email format validation: `z.string().email('Invalid email address')`
- Update minimum length requirements (email validation covers this)
- Update TypeScript types: `RegisterInput` and `LoginInput`

**Key Points**:
- Email validation ensures proper format (user@domain.com)
- Error messages should be user-friendly
- Type inference from Zod schemas automatically updates

### 3. Authentication Routes

Update `server/routes/auth.ts`:
- Change all references from `username` to `email` in request bodies
- Update Prisma queries: `findUnique({ where: { email } })`
- Update JWT token generation to include email instead of username
- Update error messages: "Invalid email or password"
- Update response objects to return email instead of username

**Key Points**:
- Register endpoint checks for existing email
- Login endpoint looks up user by email
- JWT tokens include email for client-side display
- Error messages updated for email context

### 4. JWT Payload Type

Update `server/utils/auth.ts`:
- Change `JWTPayload` interface: replace `username: string` with `email: string`
- This affects token generation and verification throughout the app

**Key Points**:
- TypeScript will catch any missed username references
- JWT verify/decode operations automatically use new type

### 5. Auth Plugin Middleware

Update `server/plugins/auth.ts`:
- Change user select to retrieve `email` instead of `username`
- Update TypeScript declaration for `FastifyRequest.user` interface
- Change field from `username: string` to `email: string`

**Key Points**:
- Middleware attaches user object to requests
- Protected routes receive user with email field
- Type safety ensures consistency across protected routes

### 6. Frontend Auth Store

Update `client/stores/authStore.ts`:
- Change `User` interface: replace `username: string` with `email: string`
- Update method signatures: `login(email: string, password: string)`
- Update method signatures: `signup(email: string, password: string)`
- Update API request bodies to send email instead of username

**Key Points**:
- Zustand store manages auth state
- Persisted to localStorage automatically
- Type changes propagate to all consumers

### 7. Login Form Component

Update `client/pages/auth/components/LoginForm.tsx`:
- Rename prop from `username` to `email`
- Update prop type: `email: string`
- Change input `type="text"` to `type="email"`
- Update labels: "Username" → "Email"
- Update placeholders: "username" → "email@example.com"
- Update handler: `onUsernameChange` → `onEmailChange`

**Key Points**:
- Browser validates email format with `type="email"`
- Better UX with email-specific keyboard on mobile
- Accessibility labels updated

### 8. Signup Form Component

Update `client/pages/auth/components/SignupForm.tsx`:
- Rename prop from `username` to `email`
- Update prop type: `email: string`
- Change input `type="text"` to `type="email"`
- Update labels: "Username" → "Email"
- Update placeholders: "username" → "email@example.com"
- Update handler: `onUsernameChange` → `onEmailChange`
- Remove `minLength={3}` validation (email validation handles this)

**Key Points**:
- Consistent with LoginForm changes
- HTML5 email validation provides instant feedback
- Placeholder shows expected format

### 9. Login Page Logic

Update `client/pages/auth/Login.tsx`:
- Rename state variable: `username` → `email`
- Update setter: `setUsername` → `setEmail`
- Update error message: "Invalid username or password" → "Invalid email or password"
- Pass email to `login()` function

**Key Points**:
- State management updated for email
- Error messages reflect email context
- Type safety from store ensures correctness

### 10. Signup Page Logic

Update `client/pages/auth/Signup.tsx`:
- Rename state variable: `username` → `email`
- Update setter: `setUsername` → `setEmail`
- Replace username length validation with email format check (optional - backend validates)
- Pass email to `signup()` function

**Key Points**:
- Client-side validation can rely on HTML5 email input
- Backend validation is the source of truth
- Error messages updated for email context

## Files to Create/Modify

### New Files (1)

1. `apps/web/prisma/migrations/[timestamp]_email_migration/migration.sql` - Generated migration file

### Modified Files (10)

1. `apps/web/prisma/schema.prisma` - User model: username → email
2. `apps/web/src/server/schemas/auth.ts` - Validation schemas: username → email with .email()
3. `apps/web/src/server/routes/auth.ts` - All auth endpoints: username → email
4. `apps/web/src/server/utils/auth.ts` - JWTPayload interface: username → email
5. `apps/web/src/server/plugins/auth.ts` - User select and type declaration: username → email
6. `apps/web/src/client/stores/authStore.ts` - User interface and methods: username → email
7. `apps/web/src/client/pages/auth/components/LoginForm.tsx` - Form fields and props: username → email
8. `apps/web/src/client/pages/auth/components/SignupForm.tsx` - Form fields and props: username → email
9. `apps/web/src/client/pages/auth/Login.tsx` - State and logic: username → email
10. `apps/web/src/client/pages/auth/Signup.tsx` - State and logic: username → email

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Database Schema Migration

<!-- prettier-ignore -->
- [ ] db-schema Update User model in Prisma schema
  - Replace `username String @unique` with `email String @unique`
  - File: `apps/web/prisma/schema.prisma`
  - Lines to change: Line 48 (username field definition)
- [ ] db-reset Delete existing database
  - Run: `rm apps/web/prisma/dev.db apps/web/prisma/dev.db-journal` (journal may not exist)
  - This allows fresh migration without data conflicts
- [ ] db-migrate Generate and apply migration
  - Run: `cd apps/web && pnpm prisma:migrate`
  - Follow prompts to name migration (e.g., "email_migration")
  - Prisma will generate migration SQL and apply it
- [ ] db-verify Verify Prisma client regenerated
  - Run: `cd apps/web && pnpm prisma:generate`
  - Ensures TypeScript types are updated

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Backend Type Definitions

<!-- prettier-ignore -->
- [ ] types-jwt Update JWT payload interface
  - Replace `username: string` with `email: string` in JWTPayload
  - File: `apps/web/src/server/utils/auth.ts`
  - Line 9: Change username to email
- [ ] types-plugin Update FastifyRequest user type declaration
  - Replace `username: string` with `email: string` in user object type
  - File: `apps/web/src/server/plugins/auth.ts`
  - Line 62: Change username to email in type declaration

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Backend Validation Schemas

<!-- prettier-ignore -->
- [ ] schema-register Update registerSchema
  - Replace `username: z.string().min(3, 'Username must be at least 3 characters').max(255)` with `email: z.string().email('Invalid email address').max(255)`
  - File: `apps/web/src/server/schemas/auth.ts`
  - Line 4: Change username validation to email validation
- [ ] schema-login Update loginSchema
  - Replace `username: z.string().min(1, 'Username is required')` with `email: z.string().email('Invalid email address')`
  - File: `apps/web/src/server/schemas/auth.ts`
  - Line 9: Change username validation to email validation

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Backend Authentication Routes

<!-- prettier-ignore -->
- [ ] routes-register Update register endpoint
  - Change request body type: `Body: { username: string; password: string }` → `Body: { email: string; password: string }`
  - Change destructuring: `const { username, password }` → `const { email, password }`
  - Change Prisma create: `username` → `email`
  - Change user select: `username: true` → `email: true`
  - Change JWT payload: `username: user.username` → `email: user.email`
  - Update error message: 'DUPLICATE_USERNAME' → 'DUPLICATE_EMAIL'
  - File: `apps/web/src/server/routes/auth.ts`
  - Lines: 35, 52, 68, 74, 82, 96
- [ ] routes-login Update login endpoint
  - Change request body type: `Body: { username: string; password: string }` → `Body: { email: string; password: string }`
  - Change destructuring: `const { username, password }` → `const { email, password }`
  - Change Prisma query: `where: { username }` → `where: { email }`
  - Change error message: 'Invalid username or password' → 'Invalid email or password'
  - Change JWT payload: `username: user.username` → `email: user.email`
  - Change response: `username: user.username` → `email: user.email`
  - File: `apps/web/src/server/routes/auth.ts`
  - Lines: 106, 123, 127, 131, 149, 164
- [ ] routes-plugin Update auth plugin user selection
  - Change Prisma select: `username: true` → `email: true`
  - File: `apps/web/src/server/plugins/auth.ts`
  - Line 26: Change select field

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 5: Frontend State Management

<!-- prettier-ignore -->
- [ ] store-interface Update User interface
  - Replace `username: string` with `email: string`
  - File: `apps/web/src/client/stores/authStore.ts`
  - Line 11: Change username to email
- [ ] store-login-signature Update login method signature
  - Change parameter: `(username: string, password: string)` → `(email: string, password: string)`
  - Update JSDoc: `@param username` → `@param email`
  - File: `apps/web/src/client/stores/authStore.ts`
  - Lines 26, 30
- [ ] store-login-impl Update login method implementation
  - Change destructuring: `login: async (username: string, password: string)` → `login: async (email: string, password: string)`
  - Change request body: `{ username, password }` → `{ email, password }`
  - File: `apps/web/src/client/stores/authStore.ts`
  - Lines 75, 79
- [ ] store-signup-signature Update signup method signature
  - Change parameter: `(username: string, password: string)` → `(email: string, password: string)`
  - Update JSDoc: `@param username - Desired username` → `@param email - Email address`
  - File: `apps/web/src/client/stores/authStore.ts`
  - Lines 34, 38
- [ ] store-signup-impl Update signup method implementation
  - Change destructuring: `signup: async (username: string, password: string)` → `signup: async (email: string, password: string)`
  - Change request body: `{ username, password }` → `{ email, password }`
  - File: `apps/web/src/client/stores/authStore.ts`
  - Lines 99, 103

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 6: Frontend Login Form UI

<!-- prettier-ignore -->
- [ ] login-form-props Update LoginForm props interface
  - Rename prop: `username: string` → `email: string`
  - Rename handler: `onUsernameChange: (username: string) => void` → `onEmailChange: (email: string) => void`
  - File: `apps/web/src/client/pages/auth/components/LoginForm.tsx`
  - Lines 13, 17
- [ ] login-form-destructure Update LoginForm destructuring
  - Change: `username` → `email`
  - Change: `onUsernameChange` → `onEmailChange`
  - File: `apps/web/src/client/pages/auth/components/LoginForm.tsx`
  - Lines 25, 29
- [ ] login-form-description Update form description
  - Change: "Enter your username below" → "Enter your email below"
  - File: `apps/web/src/client/pages/auth/components/LoginForm.tsx`
  - Line 39
- [ ] login-form-field Update email field
  - Change label: "Username" → "Email"
  - Change id: "username" → "email"
  - Change type: `type="text"` → `type="email"`
  - Change placeholder: "username" → "email@example.com"
  - Change value: `username` → `email`
  - Change onChange: `onUsernameChange` → `onEmailChange`
  - File: `apps/web/src/client/pages/auth/components/LoginForm.tsx`
  - Lines 44-51

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 7: Frontend Signup Form UI

<!-- prettier-ignore -->
- [ ] signup-form-props Update SignupForm props interface
  - Rename prop: `username: string` → `email: string`
  - Rename handler: `onUsernameChange: (username: string) => void` → `onEmailChange: (email: string) => void`
  - File: `apps/web/src/client/pages/auth/components/SignupForm.tsx`
  - Lines 13, 18
- [ ] signup-form-destructure Update SignupForm destructuring
  - Change: `username` → `email`
  - Change: `onUsernameChange` → `onEmailChange`
  - File: `apps/web/src/client/pages/auth/components/SignupForm.tsx`
  - Lines 27, 32
- [ ] signup-form-field Update email field
  - Change label: "Username" → "Email"
  - Change id: "username" → "email"
  - Change type: `type="text"` → `type="email"`
  - Change placeholder: "username" → "email@example.com"
  - Change value: `username` → `email`
  - Change onChange: `onUsernameChange` → `onEmailChange`
  - Remove minLength attribute (email validation handles this)
  - File: `apps/web/src/client/pages/auth/components/SignupForm.tsx`
  - Lines 48-56

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 8: Frontend Page Logic

<!-- prettier-ignore -->
- [ ] login-page-state Update Login page state
  - Rename state: `const [username, setUsername]` → `const [email, setEmail]`
  - File: `apps/web/src/client/pages/auth/Login.tsx`
  - Line 10
- [ ] login-page-handler Update Login page handler
  - Change call: `await login(username, password)` → `await login(email, password)`
  - File: `apps/web/src/client/pages/auth/Login.tsx`
  - Line 23
- [ ] login-page-error Update Login page error message
  - Change: "Invalid username or password" → "Invalid email or password"
  - File: `apps/web/src/client/pages/auth/Login.tsx`
  - Line 26
- [ ] login-page-props Update LoginForm props
  - Change: `username={username}` → `email={email}`
  - Change: `onUsernameChange={setUsername}` → `onEmailChange={setEmail}`
  - File: `apps/web/src/client/pages/auth/Login.tsx`
  - Lines 40, 44
- [ ] signup-page-state Update Signup page state
  - Rename state: `const [username, setUsername]` → `const [email, setEmail]`
  - File: `apps/web/src/client/pages/auth/Signup.tsx`
  - Line 9
- [ ] signup-page-validation Update Signup page validation
  - Change validation: `if (username.length < 3)` → `if (!email.includes('@'))`
  - Change error: "Username must be at least 3 characters" → "Please enter a valid email address"
  - File: `apps/web/src/client/pages/auth/Signup.tsx`
  - Lines 21-24
- [ ] signup-page-handler Update Signup page handler
  - Change call: `await signup(username, password)` → `await signup(email, password)`
  - File: `apps/web/src/client/pages/auth/Signup.tsx`
  - Line 39
- [ ] signup-page-props Update SignupForm props
  - Change: `username={username}` → `email={email}`
  - Change: `onUsernameChange={setUsername}` → `onEmailChange={setEmail}`
  - File: `apps/web/src/client/pages/auth/Signup.tsx`
  - Lines 56, 61

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 9: Validation and Testing

<!-- prettier-ignore -->
- [ ] validate-build Run build to check for compilation errors
  - Run: `cd apps/web && pnpm build`
  - Expected: Clean build with no TypeScript errors
- [ ] validate-types Run type checking
  - Run: `cd apps/web && pnpm check-types`
  - Expected: No type errors
- [ ] validate-lint Run linting
  - Run: `cd apps/web && pnpm lint`
  - Expected: No lint errors
- [ ] test-manual-signup Manual test: Sign up with email
  - Start dev server: `cd apps/web && pnpm dev`
  - Navigate to signup page
  - Create account with valid email (test@example.com)
  - Verify successful account creation and auto-login
- [ ] test-manual-login Manual test: Log in with email
  - Log out from test account
  - Navigate to login page
  - Log in with same email credentials
  - Verify successful login
- [ ] test-email-validation Test email validation
  - Try signing up with invalid email (no @ symbol)
  - Verify validation error appears
  - Try with valid email format
  - Verify it accepts and proceeds

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**Note**: Existing tests should be updated if they reference username fields.

**Files to check**:
- `apps/web/src/client/stores/authStore.test.ts` - May need username → email updates

### Integration Tests

Manual integration testing covers:
1. **Registration flow**: New user signs up with email
2. **Login flow**: User logs in with email credentials
3. **JWT token**: Token contains email in payload
4. **Protected routes**: Routes receive user object with email field
5. **Validation**: Invalid email formats are rejected

### E2E Tests

Not applicable - manual testing sufficient for this migration.

## Success Criteria

- [ ] User model in database has `email` field instead of `username`
- [ ] Registration endpoint accepts email and validates format
- [ ] Login endpoint authenticates using email
- [ ] JWT tokens contain email instead of username
- [ ] Login form shows "Email" label and uses email input type
- [ ] Signup form shows "Email" label and uses email input type
- [ ] Email validation works on frontend (HTML5) and backend (Zod)
- [ ] Error messages reference "email" not "username"
- [ ] TypeScript compilation succeeds with no errors
- [ ] User can successfully sign up with valid email
- [ ] User can successfully log in with email
- [ ] Invalid email formats are rejected with clear error messages

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web && pnpm build
# Expected: Build completes successfully with no errors

# Type checking
cd apps/web && pnpm check-types
# Expected: No TypeScript errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Check Prisma schema
cd apps/web && pnpm prisma:generate
# Expected: Client generated successfully, no errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/signup`
3. Verify: Form shows "Email" field (not "Username")
4. Test signup with invalid email (e.g., "notanemail"): Should show validation error
5. Test signup with valid email (e.g., "test@example.com"): Should create account and log in
6. Log out and navigate to login page: `http://localhost:5173/login`
7. Verify: Form shows "Email" field (not "Username")
8. Test login with the email you signed up with: Should log in successfully
9. Open browser dev tools → Application → Local Storage → auth-storage
10. Check stored user object: Should show `email` field (not `username`)
11. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify email input shows email-specific keyboard on mobile browsers
- Verify browser autocomplete suggests email addresses (due to `type="email"`)
- Verify database contains `email` column: `cd apps/web && pnpm prisma:studio` → Open Users table → Verify email column exists
- Verify JWT token contains email: Use jwt.io to decode token from localStorage, check payload has `email` field

## Implementation Notes

### 1. Database Reset vs Migration

We chose to reset the database rather than create a data migration because:
- This is a single-user development system
- No production data needs to be preserved
- Simpler and faster than writing migration logic
- Avoids potential conflicts with existing username data

If you need to preserve existing users, you would need to:
1. Add email column without removing username
2. Populate email column with placeholder values or prompt users
3. Then remove username column in a second migration

### 2. Email Validation

Email validation happens at three levels:
1. **HTML5 Browser Validation**: `type="email"` provides instant client-side feedback
2. **Frontend Validation**: Optional additional validation in Signup.tsx for better UX
3. **Backend Validation**: Zod `.email()` validator is the source of truth and prevents invalid data

### 3. JWT Token Compatibility

After this change, old JWT tokens containing `username` will become invalid:
- Users will need to log out and log back in
- Acceptable for development/single-user system
- For production, you'd need a migration strategy (dual-field support period, token refresh, etc.)

### 4. TypeScript Type Safety

The changes leverage TypeScript's type system to ensure completeness:
- Changing the Prisma schema regenerates types
- JWT payload interface changes propagate through all auth code
- Compiler errors will catch any missed username references
- Use `pnpm check-types` to verify no references remain

## Dependencies

- No new dependencies required
- Existing dependencies used:
  - `zod` - Email validation via `.email()` method
  - `@prisma/client` - Database operations with new schema
  - `bcrypt` - Password hashing (unchanged)
  - `@fastify/jwt` - JWT token generation (unchanged)

## Timeline

| Task                           | Estimated Time |
| ------------------------------ | -------------- |
| Database Schema Migration      | 15 minutes     |
| Backend Type Definitions       | 10 minutes     |
| Backend Validation Schemas     | 10 minutes     |
| Backend Authentication Routes  | 30 minutes     |
| Frontend State Management      | 20 minutes     |
| Frontend Login Form UI         | 15 minutes     |
| Frontend Signup Form UI        | 15 minutes     |
| Frontend Page Logic            | 20 minutes     |
| Validation and Testing         | 30 minutes     |
| **Total**                      | **2-3 hours**  |

## References

- Zod Email Validation: https://zod.dev/?id=strings
- Prisma Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- HTML Email Input: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email
- Fastify JWT Plugin: https://github.com/fastify/fastify-jwt

## Next Steps

1. Begin with Task Group 1: Database Schema Migration
2. Delete existing database file: `rm apps/web/prisma/dev.db`
3. Update Prisma schema: Change `username` to `email` in User model
4. Run migration: `cd apps/web && pnpm prisma:migrate`
5. Proceed through remaining task groups sequentially
6. Test thoroughly after backend changes before moving to frontend
7. Perform final validation with manual testing of complete auth flow
