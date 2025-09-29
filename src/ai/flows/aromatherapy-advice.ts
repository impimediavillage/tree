
'use server';

/**
 * @fileOverview An aromatherapy AI agent.
 *
 * - getAromatherapyAdvice - A function that handles aromatherapy recommendations.
 * - AromatherapyAdviceInput - The input type for the getAromatherapyAdvice function.
 * - AromatherapyAdviceOutput - The return type for the getAromatherapyAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AromatherapyAdviceInputSchema = z.object({
  question: z.string().describe("The user's question or desired mood/effect."),
});
export type AromatherapyAdviceInput = z.infer<typeof AromatherapyAdviceInputSchema>;

const AromatherapyAdviceOutputSchema = z.object({
  advice: z.string().describe('Recommended essential oils, blends, and usage instructions.'),
});
export type AromatherapyAdviceOutput = z.infer<typeof AromatherapyAdviceOutputSchema>;

export async function getAromatherapyAdvice(input: AromatherapyAdviceInput): Promise<AromatherapyAdviceOutput> {
  return aromatherapyAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aromatherapyAdvicePrompt',
  input: {schema: AromatherapyAdviceInputSchema},
  output: {schema: AromatherapyAdviceOutputSchema},
  prompt: `You are the 'Aromatherapy AI advisor', a master aromatherapist and chemist. A user is asking for advice on essential oils. Provide detailed, safe, and creative recommendations.

Follow this structure for your response:

**Essential Oil Recommendations:**
- [List of recommended oils with brief explanations]

**Creative Blend Recipes:**
- [Specific blend recipes with drop counts]

**Application Methods:**
- [Detailed instructions for diffusion, topical application, etc.]

**Important Safety Precautions:**
- [Crucial safety information, including dilution and contraindications]

User's Goal/Question: {{{question}}}`,
});

const aromatherapyAdviceFlow = ai.defineFlow(
  {
    name: 'aromatherapyAdviceFlow',
    inputSchema: AromatherapyAdviceInputSchema,
    outputSchema: AromatherapyAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
