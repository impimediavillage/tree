
'use server';

/**
 * @fileOverview A Qigong advice AI agent.
 *
 * - getQigongAdvice - A function that handles Qigong recommendations and explanations.
 * - QigongAdviceInput - The input type for the getQigongAdvice function.
 * - QigongAdviceOutput - The return type for the getQigongAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QigongAdviceInputSchema = z.object({
  question: z.string().describe("The user's question about Qigong."),
});
export type QigongAdviceInput = z.infer<typeof QigongAdviceInputSchema>;

const QigongAdviceOutputSchema = z.object({
  advice: z.string().describe('Personalized advice and exercises related to Qigong.'),
});
export type QigongAdviceOutput = z.infer<typeof QigongAdviceOutputSchema>;

export async function getQigongAdvice(input: QigongAdviceInput): Promise<QigongAdviceOutput> {
  return qigongAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qigongAdvicePrompt',
  input: {schema: QigongAdviceInputSchema},
  output: {schema: QigongAdviceOutputSchema},
  prompt: `You are 'Qigong knowledge with AI', a wise and experienced Qigong master. A student has come to you with a question. Provide clear, safe, and insightful guidance based on traditional Qigong principles. Explain exercises, philosophy, or concepts as needed. Always encourage a gentle and mindful approach.

  Student's Question: {{{question}}}`,
});

const qigongAdviceFlow = ai.defineFlow(
  {
    name: 'qigongAdviceFlow',
    inputSchema: QigongAdviceInputSchema,
    outputSchema: QigongAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
