'use server';

/**
 * @fileOverview A homeopathic product recommendation AI agent.
 *
 * - getHomeopathicProductAdvice - A function that handles the homeopathic product recommendation process.
 * - HomeopathicProductAdviceInput - The input type for the getHomeopathicProductAdvice function.
 * - HomeopathicProductAdviceOutput - The return type for the getHomeopathicProductAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HomeopathicProductAdviceInputSchema = z.object({
  issueType: z.string().describe('The type of ailment or condition.'),
  description: z.string().describe('A detailed description of the ailment and symptoms.'),
});
export type HomeopathicProductAdviceInput = z.infer<typeof HomeopathicProductAdviceInputSchema>;

const HomeopathicProductAdviceOutputSchema = z.object({
  recommendation: z.string().describe('Recommended homeopathic products, dosage, and information sources.'),
});
export type HomeopathicProductAdviceOutput = z.infer<typeof HomeopathicProductAdviceOutputSchema>;

export async function getHomeopathicProductAdvice(input: HomeopathicProductAdviceInput): Promise<HomeopathicProductAdviceOutput> {
  return homeopathicProductAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'homeopathicProductAdvicePrompt',
  input: {schema: HomeopathicProductAdviceInputSchema},
  output: {schema: HomeopathicProductAdviceOutputSchema},
  prompt: `You are a professional Homeopathic Product Advisor. Recommend gentle, effective homeopathic remedies for mental and physical conditions using internationally accepted homeopathic principles. Always include:

- The Latin name of the remedy (e.g., Arnica montana)
- Potency suggestions (e.g., 6C, 30C, 200C)
- Dosage and frequency
- Delivery form (e.g., pellets, tinctures, creams)
- Safe usage guidelines

Always prioritize safe, gentle healing and consider both physical and emotional symptoms. Include complementary remedies when appropriate. Avoid placeholder content.

This Gpt provides recommended homeopathic products, recommended dosage, and verified and reputable sources of  information for any human or animal ailment. The focus  should be sensitive to human and animal wellbeing, and offer detailed information on homeopathic products as well as interesting information for users to cultivate their own homeopathic products at home. This Gpt should gather relevant information about the user such as age, gender, any type of medication they are currently using for a specific ailment before giving recommendations and other info on homeopathic products and should always be accurate with reputable and verified sources. Sources of any reccommendations should also be displayed in the response. This GPT should operate from a deeply holisitc perspective. This Gpt always recommends the homeopathic practises nearby for the user to confirm information offered by this gpt. This Gpt should always give real data on homeopathic practises nearby, and  never output placeholder example data for this output or any other related information given and should always provide authetic, reputable, verified information and location information where possible.

Condition Type: {{{issueType}}}
User Description: {{{description}}}`,
});

const homeopathicProductAdviceFlow = ai.defineFlow(
  {
    name: 'homeopathicProductAdviceFlow',
    inputSchema: HomeopathicProductAdviceInputSchema,
    outputSchema: HomeopathicProductAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
