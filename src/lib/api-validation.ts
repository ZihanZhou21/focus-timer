import { z, ZodError } from 'zod'

export const batchTaskIdsSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1).max(50),
})

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const taskIdParamSchema = z.object({
  id: z.string().trim().min(1),
})

export const createTaskSchema = z
  .object({
    userId: z.string().trim().min(1).default('user_001'),
    type: z.enum(['todo', 'check-in']),
    title: z.string().trim().min(1).max(200),
    content: z.array(z.string().trim().max(500)).default([]),
    status: z
      .enum(['pending', 'in_progress', 'completed', 'archived'])
      .default('pending'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    tags: z.array(z.string().trim().min(1).max(50)).default([]),
    completedAt: z.array(dateStringSchema).default([]),
    plannedTime: z.string().trim().max(20).nullable().optional(),
    dueDate: z.string().trim().nullable().optional(),
    estimatedDuration: z.number().int().min(1).optional(),
    dailyTimeStats: z.record(dateStringSchema, z.number().nonnegative()).optional(),
    checkInHistory: z
      .array(
        z.object({
          date: dateStringSchema,
          note: z.string().max(1000).default(''),
          rating: z.number().int().min(1).max(5).default(3),
        })
      )
      .optional(),
    recurrence: z
      .object({
        frequency: z.enum(['daily', 'weekly']),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
      })
      .optional(),
  })
  .passthrough()

export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    completedAt: z
      .union([dateStringSchema, z.array(dateStringSchema), z.null()])
      .optional(),
    details: z.array(z.string().trim().max(500)).optional(),
  })
  .passthrough()

export const taskSessionSchema = z.object({
  duration: z.number().int().positive().max(24 * 60 * 60),
})

export const completeTaskSchema = z.object({
  duration: z.number().int().nonnegative().max(24 * 60 * 60).optional(),
})

export const weeklyStatsQuerySchema = z.object({
  userId: z.string().trim().min(1).default('user_001'),
  days: z.coerce.number().int().min(1).max(30).default(7),
  endDate: dateStringSchema.optional(),
})

export const monthlyStatsQuerySchema = z
  .object({
    userId: z.string().trim().min(1).default('user_001'),
    year: z.coerce.number().int().min(1970).max(3000).default(new Date().getFullYear()),
    month: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
  })
  .refine(
    (value) => (!value.startDate && !value.endDate) || (value.startDate && value.endDate),
    {
      message: 'startDate and endDate must be provided together',
      path: ['startDate'],
    }
  )

export type BatchTaskIdsInput = z.infer<typeof batchTaskIdsSchema>

export function formatValidationError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
    .join('; ')
}
