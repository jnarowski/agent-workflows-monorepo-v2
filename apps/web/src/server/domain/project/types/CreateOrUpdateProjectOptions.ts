import { z } from 'zod'

// Zod schema (runtime validation)
// Uses CREATE pattern: { data: {...} }
export const createOrUpdateProjectOptionsSchema = z.object({
  data: z.object({
    name: z.string().min(1, 'Name required'),
    path: z.string().min(1, 'Path required')
  })
})

// TypeScript type (compile-time) - single source of truth
export type CreateOrUpdateProjectOptions = z.infer<typeof createOrUpdateProjectOptionsSchema>
