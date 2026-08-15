'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting student at-risk status based on their attendance data.
 *
 * - predictStudentRisk - A function that analyzes a student's attendance and returns a risk assessment.
 * - PredictStudentRiskInput - The input type for the predictStudentRisk function.
 * - PredictStudentRiskOutput - The output type for the predictStudentRisk function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictStudentRiskInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  attendanceData: z.string().describe('A JSON string representing an array of attendance records for the student. Each record should include date and status (\'present\', \'absent\', \'late\').'),
});
export type PredictStudentRiskInput = z.infer<typeof PredictStudentRiskInputSchema>;

const PredictStudentRiskOutputSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']).describe('The predicted risk level for the student.'),
  reasoning: z.string().describe('A brief explanation for the predicted risk level.'),
});
export type PredictStudentRiskOutput = z.infer<typeof PredictStudentRiskOutputSchema>;

export async function predictStudentRisk(input: PredictStudentRiskInput): Promise<PredictStudentRiskOutput> {
  return predictStudentRiskFlow(input);
}

const studentRiskPrompt = ai.definePrompt({
  name: 'studentRiskPrompt',
  input: {schema: PredictStudentRiskInputSchema},
  output: {schema: PredictStudentRiskOutputSchema},
  prompt: `You are an expert student success advisor for an advanced education institution. Your goal is to identify students who may be at risk of falling behind based on their attendance patterns.

Analyze the attendance data for the student: {{studentName}}.

Attendance Data (JSON):
{{attendanceData}}

Consider the following when making your assessment:
- Overall attendance percentage.
- Frequency of absences.
- Patterns of lateness (e.g., consistently late for a specific class).
- Clusters of absences (e.g., multiple missed classes in a short period).

Based on your analysis, determine the student's risk level (low, medium, or high) and provide a concise reasoning. A high-risk student might have an attendance rate below 80%, frequent absences, or a pattern of increasing absenteeism. A medium-risk student might be occasionally late or have a few sporadic absences. A low-risk student has excellent or near-perfect attendance.
  `,
});

const predictStudentRiskFlow = ai.defineFlow(
  {
    name: 'predictStudentRiskFlow',
    inputSchema: PredictStudentRiskInputSchema,
    outputSchema: PredictStudentRiskOutputSchema,
  },
  async input => {
    const {output} = await studentRiskPrompt(input);
    return output!;
  }
);
