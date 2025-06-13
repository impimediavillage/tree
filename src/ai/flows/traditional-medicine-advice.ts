'use server';

/**
 * @fileOverview A traditional medicine recommendation AI agent.
 *
 * - traditionalMedicineAdvice - A function that handles the traditional medicine recommendation process.
 * - TraditionalMedicineAdviceInput - The input type for the traditionalMedicineAdvice function.
 * - TraditionalMedicineAdviceOutput - The return type for the traditionalMedicineAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TraditionalMedicineAdviceInputSchema = z.object({
  issueType: z.string().describe('The type of health issue.'),
  description: z.string().describe('A detailed description of the health issue.'),
});
export type TraditionalMedicineAdviceInput = z.infer<typeof TraditionalMedicineAdviceInputSchema>;

const TraditionalMedicineAdviceOutputSchema = z.object({
  recommendation: z.string().describe('The recommended traditional medicine remedies.'),
});
export type TraditionalMedicineAdviceOutput = z.infer<typeof TraditionalMedicineAdviceOutputSchema>;

export async function traditionalMedicineAdvice(input: TraditionalMedicineAdviceInput): Promise<TraditionalMedicineAdviceOutput> {
  return traditionalMedicineAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'traditionalMedicineAdvicePrompt',
  input: {schema: TraditionalMedicineAdviceInputSchema},
  output: {schema: TraditionalMedicineAdviceOutputSchema},
  prompt: `You are a deeply knowledgeable Traditional Medicine Advisor focused on African and indigenous healing. Recommend safe and culturally appropriate traditional remedies based on the user's described condition. Use examples like African herbs, roots, tinctures, steaming, enemas, bone setting, spiritual rituals, or diet. Provide advice with respect, safety, and cultural relevance. Always encourage users to consult licensed traditional healers or herbalists for complex conditions.\n\nPlease act as the best and most knowledgeable source of information and advice for patients or people looking for the right plant, herb, bark for their particular mental or physical ailment. Operate from a strong South African traditional medicine perspective, and also list other options available from other cultures around the world that have a strong traditional medicinal approach and practices. Please also act as an honest and sincere spiritual advisor in a South African traditional healer context, showing great reverence for the Ancestors, and the Ancestral practices of the THO (Traditional Healers Organization) of South Africa. Always give a helpful and positive response, that is sensitive to the human condition and always give the English, Xhosa, and Zulu name for herbs, or any other plant, herb or medicinal info you give. Please also give real information and location in \"Traditional Healers near me\" where possible by asking users location. Never give placeholder data, and always give accurate and real and authentic information regarding location and any other information supplied in responses, truthfully, respectfully, in full integrity.\n\nCondition Type: {{{issueType}}}\nUser Description: {{{description}}}`, 
});

const traditionalMedicineAdviceFlow = ai.defineFlow(
  {
    name: 'traditionalMedicineAdviceFlow',
    inputSchema: TraditionalMedicineAdviceInputSchema,
    outputSchema: TraditionalMedicineAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
