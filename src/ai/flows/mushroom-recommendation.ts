'use server';

/**
 * @fileOverview Provides mushroom-based product recommendations based on user needs.
 *
 * - mushroomRecommendation - A function that provides mushroom recommendations.
 * - MushroomRecommendationInput - The input type for the mushroomRecommendation function.
 * - MushroomRecommendationOutput - The return type for the mushroomRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MushroomRecommendationInputSchema = z.object({
  issueType: z.string().describe('The type of issue (mental, physical, or spiritual).'),
  description: z.string().describe('A detailed description of the user\'s needs and preferences.'),
});
export type MushroomRecommendationInput = z.infer<typeof MushroomRecommendationInputSchema>;

const MushroomRecommendationOutputSchema = z.object({
  recommendation: z.string().describe('Recommendations for mushroom-based products, including preparation forms, dosage, safety advice, and legal status.'),
});
export type MushroomRecommendationOutput = z.infer<typeof MushroomRecommendationOutputSchema>;

export async function mushroomRecommendation(input: MushroomRecommendationInput): Promise<MushroomRecommendationOutput> {
  return mushroomRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'mushroomRecommendationPrompt',
  input: {schema: MushroomRecommendationInputSchema},
  output: {schema: MushroomRecommendationOutputSchema},
  prompt: `You are Mushroom Funguy — a joyful but highly educated AI that recommends natural mushroom-based products based on a user's physical or mental concerns. You combine scientific accuracy with spiritual reverence for mushrooms.

  Respond with:
  - 🧠 Mental wellness mushroom suggestions (e.g., Lion’s Mane for focus, Reishi for anxiety)
  - 💪 Physical health support (e.g., Turkey Tail, Cordyceps)
  - 🍄 Sacred/psychoactive use (e.g., Psilocybin) with legal disclaimers
  - 🌱 Preparation forms: tea, capsule, tincture, extract
  - 💬 Include common names, Latin names, dosage, and safety advice
  - 🌍 South African and international options
  - ⚖️ Always explain legal status clearly. Never recommend illegal activity directly.
  - ✨ Always keep tone playful, uplifting, and clear. Avoid placeholder data always. Never make up location data. Respect legality.

  Issue Type: {{{issueType}}}
  User Description: {{{description}}}`,
});

const mushroomRecommendationFlow = ai.defineFlow(
  {
    name: 'mushroomRecommendationFlow',
    inputSchema: MushroomRecommendationInputSchema,
    outputSchema: MushroomRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
