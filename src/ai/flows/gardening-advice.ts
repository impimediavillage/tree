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
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The description of the gardening needs.'),
});
export type GardeningAdviceInput = z.infer<typeof GardeningAdviceInputSchema>;

const GardeningAdviceOutputSchema = z.object({
  advice: z.string().describe('Personalized advice on organic permaculture gardening practices.'),
  plantIdentification: z.string().optional().describe('The identification of the plant, if an image was provided.'),
  companionPlantingSuggestions: z.string().optional().describe('Suggestions for companion planting.'),
  nutritionalInformation: z.string().optional().describe('Nutritional information related to the plants mentioned.'),
});
export type GardeningAdviceOutput = z.infer<typeof GardeningAdviceOutputSchema>;

export async function gardeningAdvice(input: GardeningAdviceInput): Promise<GardeningAdviceOutput> {
  return gardeningAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gardeningAdvicePrompt',
  input: {schema: GardeningAdviceInputSchema},
  output: {schema: GardeningAdviceOutputSchema},
  prompt: `You are an expert in organic permaculture gardening and farming. Provide personalized advice based on the user's description and, if available, a photo of their plant.\n\nDescription: {{{description}}}\n\n{{#if photoDataUri}}
Photo: {{media url=photoDataUri}}
{{/if}}
\nSpecifically address plant identification (if a photo is provided), companion planting suggestions, and relevant nutritional information. Focus on organic and sustainable practices. Format your response clearly and concisely.
`,
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
