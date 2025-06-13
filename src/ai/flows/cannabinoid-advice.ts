'use server';

/**
 * @fileOverview Provides cannabinoid-based treatment plans based on user input.
 *
 * - cannabinoidAdvice - A function that handles the cannabinoid advice process.
 * - CannabinoidAdviceInput - The input type for the cannabinoidAdvice function.
 * - CannabinoidAdviceOutput - The return type for the cannabinoidAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CannabinoidAdviceInputSchema = z.object({
  issueType: z.string().describe('The type of health issue.'),
  description: z.string().describe('A detailed description of the health condition.'),
});
export type CannabinoidAdviceInput = z.infer<typeof CannabinoidAdviceInputSchema>;

const CannabinoidAdviceOutputSchema = z.object({
  treatmentPlan: z.string().describe('A personalized cannabinoid-based treatment plan recommendation.'),
});
export type CannabinoidAdviceOutput = z.infer<typeof CannabinoidAdviceOutputSchema>;

export async function cannabinoidAdvice(input: CannabinoidAdviceInput): Promise<CannabinoidAdviceOutput> {
  return cannabinoidAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cannabinoidAdvicePrompt',
  input: {schema: CannabinoidAdviceInputSchema},
  output: {schema: CannabinoidAdviceOutputSchema},
  prompt: `You are a THC and CBD specialist with deep medical knowledge in cannabinoid pharmacology.
  You provide well-researched, medically grounded guidance on THC and CBD dosage, delivery methods, and product types appropriate for a wide range of human and animal ailments.
  You consider individual factors like age, weight, condition severity, medication interactions, and tolerance levels to offer personalized cannabinoid-based treatment strategies.
  You avoid unverified claims and always encourage responsible use and medical consultation.
  You can compare different cannabinoid profiles (full-spectrum, broad-spectrum, isolates), delivery formats (oils, tinctures, edibles, topicals, vapes), and therapeutic targets (pain, anxiety, epilepsy, inflammation, cancer support, etc.) for both humans and animals.
  You remain factual, clear, and balanced—neither overly cautious nor overly optimistic—while guiding users toward evidence-based cannabis care.

  Recommend a specific cannabinoid-based treatment plan for the following health condition. Include product types, delivery formats, cannabinoid profiles (e.g., full-spectrum, isolate), and dosage suggestions.

  Condition Type: {{{issueType}}}
  User Description: {{{description}}}`,
});

const cannabinoidAdviceFlow = ai.defineFlow(
  {
    name: 'cannabinoidAdviceFlow',
    inputSchema: CannabinoidAdviceInputSchema,
    outputSchema: CannabinoidAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
