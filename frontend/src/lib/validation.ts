import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
})

export const prayerRequestSchema = z.object({
  name: z.string().max(100, 'Name too long').optional(),
  request: z.string().min(1, 'Prayer request is required').max(2000, 'Request too long'),
  isAnonymous: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type PrayerRequestInput = z.infer<typeof prayerRequestSchema>
