import { z } from 'zod';
import { Category, Priority } from '../generated/prisma/enums.js';

export const analysisResultSchema = z.object({
  category: z.enum(Category).describe('Type of work the ops team must do'),
  priority: z.enum(Priority).describe('Urgency for the operations team'),
  summary: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe('One or two sentence summary of the issue'),
  recommendedAction: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe('Concrete next step for the operations user'),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
