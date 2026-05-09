import { z, ZodError } from 'zod'

export const batchTaskIdsSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1).max(50),
})

export type BatchTaskIdsInput = z.infer<typeof batchTaskIdsSchema>

export function formatValidationError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
    .join('; ')
}
