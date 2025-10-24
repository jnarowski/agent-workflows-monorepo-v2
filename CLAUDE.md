- Remember when removing a page, to remove it's corresponding route as well
- Import React hooks directly (e.g., `import { useEffect, useState } from 'react'`) instead of using `React.useEffect`. This is cleaner, more modern, and enables better tree-shaking
- unit tests should be added right next to the file in the same folder
- Let's make a note that in order to add things to fastify response you need to also modify the zod schema eg:           200:
  projectResponseSchema,