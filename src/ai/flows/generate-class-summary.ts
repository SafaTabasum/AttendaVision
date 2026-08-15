
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a class summary,
 * highlighting key attendance information such as absentees, lateness trends, and overall attendance rate.
 *
 * @exports generateClassSummary - An asynchronous function that generates a class attendance summary.
 * @exports GenerateClassSummaryInput - The input type for the generateClassSummary function.
 * @exports GenerateClassSummaryOutput - The output type for the generateClassSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Input schema for the class summary generation flow.
 */
const GenerateClassSummaryInputSchema = z.object({
  className: z.string().describe('The name of the class.'),
  date: z.string().describe('The date for which to generate the summary (YYYY-MM-DD).'),
  attendanceData: z.string().describe('Attendance data of students in a class, JSON stringified, including student names, attendance status (present, absent, late), and timestamps.'),
});
export type GenerateClassSummaryInput = z.infer<typeof GenerateClassSummaryInputSchema>;

/**
 * Output schema for the class summary generation flow.
 */
const GenerateClassSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the class attendance, including absentees, lateness trends, and overall attendance rate.'),
});
export type GenerateClassSummaryOutput = z.infer<typeof GenerateClassSummaryOutputSchema>;

/**
 * Asynchronous function to generate a class summary.
 * @param input - The input data for generating the class summary.
 * @returns A promise that resolves to the class summary.
 */
export async function generateClassSummary(input: GenerateClassSummaryInput): Promise<GenerateClassSummaryOutput> {
  return generateClassSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateClassSummaryPrompt',
  input: {schema: GenerateClassSummaryInputSchema},
  output: {schema: GenerateClassSummaryOutputSchema},
  prompt: `You are an AI assistant helping teachers summarize class attendance.

  Generate a summary for the class: {{className}} on {{date}}.

  Here is the attendance data in JSON format:
  {{attendanceData}}

  Include the following in the summary:
  - List of absent students.
  - Common lateness trends (e.g., several students consistently late).
  - Overall attendance rate for the class.
  - Any other noteworthy patterns in the attendance data.

  The summary should be concise and easy to understand.
`,
});

const generateClassSummaryFlow = ai.defineFlow(
  {
    name: 'generateClassSummaryFlow',
    inputSchema: GenerateClassSummaryInputSchema,
    outputSchema: GenerateClassSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

