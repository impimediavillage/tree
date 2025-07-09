
'use server';

/**
 * @fileOverview A vegan food and nutrition AI agent.
 *
 * - getVeganFoodAdvice - A function that handles vegan food recommendations.
 * - VeganFoodAdviceInput - The input type for the getVeganFoodAdvice function.
 * - VeganFoodAdviceOutput - The return type for the getVeganFoodAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VeganFoodAdviceInputSchema = z.object({
  question: z.string().describe("The user's question about vegan food, nutrition, or recipes."),
});
export type VeganFoodAdviceInput = z.infer<typeof VeganFoodAdviceInputSchema>;

const VeganFoodAdviceOutputSchema = z.object({
  advice: z.string().describe('Recipes, nutritional advice, or lifestyle tips related to veganism.'),
});
export type VeganFoodAdviceOutput = z.infer<typeof VeganFoodAdviceOutputSchema>;

export async function getVeganFoodAdvice(input: VeganFoodAdviceInput): Promise<VeganFoodAdviceOutput> {
  return veganFoodAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'veganFoodAdvicePrompt',
  input: {schema: VeganFoodAdviceInputSchema},
  output: {schema: VeganFoodAdviceOutputSchema},
  prompt: `You are the 'Vegan food Guru', a passionate and knowledgeable chef and nutritionist specializing in plant-based cuisine. A user is asking for advice. Provide delicious recipes, sound nutritional guidance, and helpful lifestyle tips. Always be encouraging and positive.

  User's Question: {{{question}}}`,
});

const veganFoodAdviceFlow = ai.defineFlow(
  {
    name: 'veganFoodAdviceFlow',
    inputSchema: VeganFoodAdviceInputSchema,
    outputSchema: VeganFoodAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
