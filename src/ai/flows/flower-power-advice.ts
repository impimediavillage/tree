
'use server';

/**
 * @fileOverview A flower essence recommendation AI agent.
 *
 * - getFlowerPowerAdvice - A function that handles flower essence recommendations.
 * - FlowerPowerAdviceInput - The input type for the getFlowerPowerAdvice function.
 * - FlowerPowerAdviceOutput - The return type for the getFlowerPowerAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlowerPowerAdviceInputSchema = z.object({
  question: z.string().describe("The user's emotional state or question."),
});
export type FlowerPowerAdviceInput = z.infer<typeof FlowerPowerAdviceInputSchema>;

const FlowerPowerAdviceOutputSchema = z.object({
  advice: z.string().describe('Recommended flower essences and their emotional healing properties.'),
});
export type FlowerPowerAdviceOutput = z.infer<typeof FlowerPowerAdviceOutputSchema>;

export async function getFlowerPowerAdvice(input: FlowerPowerAdviceInput): Promise<FlowerPowerAdviceOutput> {
  return flowerPowerAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flowerPowerAdvicePrompt',
  input: {schema: FlowerPowerAdviceInputSchema},
  output: {schema: FlowerPowerAdviceOutputSchema},
  prompt: `You are 'Flower Power', an expert on flower essences (like Bach remedies) and their subtle emotional healing properties. A user is describing their emotional state. Based on their input, recommend specific flower essences, explain their purpose, and suggest how to use them.

  User's State/Question: {{{question}}}`,
});

const flowerPowerAdviceFlow = ai.defineFlow(
  {
    name: 'flowerPowerAdviceFlow',
    inputSchema: FlowerPowerAdviceInputSchema,
    outputSchema: FlowerPowerAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
