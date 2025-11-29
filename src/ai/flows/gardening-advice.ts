'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing gardening advice, including plant identification, companion planting, and nutritional information.
 *
 * - gardeningAdvice - A function that takes gardening needs or a plant image and returns personalized advice.
 * - GardeningAdviceInput - The input type for the gardeningAdvice function, including an optional image and description.
 * - GardeningAdviceOutput - The return type for the gardeningAdvice function, providing personalized gardening advice.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GardeningAdviceInputSchema = z.object({
  issueType: z.string().describe('The type of gardening concern.'),
  description: z.string().describe('Detailed description of gardening needs and conditions.'),
});
export type GardeningAdviceInput = z.infer<typeof GardeningAdviceInputSchema>;

const GardeningAdviceOutputSchema = z.object({
  advice: z.string().describe('Personalized advice on organic permaculture gardening practices.'),
});
export type GardeningAdviceOutput = z.infer<typeof GardeningAdviceOutputSchema>;

export async function gardeningAdvice(input: GardeningAdviceInput): Promise<GardeningAdviceOutput> {
  return gardeningAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gardeningAdvicePrompt',
  input: {schema: GardeningAdviceInputSchema},
  output: {schema: GardeningAdviceOutputSchema},
  prompt: `You are an expert in organic permaculture gardening and farming. Provide personalized advice based on the user's gardening concern and description. Focus on organic and sustainable practices. Format your response clearly and concisely.

Concern Type: {{{issueType}}}
Description: {{{description}}}`,
});

const gardeningAdviceFlow = ai.defineFlow(
  {
    name: 'gardeningAdviceFlow',
    inputSchema: GardeningAdviceInputSchema,
    outputSchema: GardeningAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
