// src/ai/flows/optimize-chamber-placement.ts
'use server';

/**
 * @fileOverview An AI agent to suggest optimal chamber placement for food items.
 *
 * - optimizeChamberPlacement - A function that suggests optimal food item placements.
 * - OptimizeChamberPlacementInput - The input type for the optimizeChamberPlacement function.
 * - OptimizeChamberPlacementOutput - The return type for the optimizeChamberPlacement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeChamberPlacementInputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('The name of the food item.'),
      expiryDate: z.string().describe('The expiry date of the food item (YYYY-MM-DD).'),
      turnoverRate: z
        .number()
        .describe('The turnover rate of the food item (0-1, higher is faster).'),
      quantity: z.number().describe('The quantity of this item.'),
    })
  ).describe('A list of food items to be placed in chambers.'),
  chambers: z.array(
    z.object({
      name: z.string().describe('The name of the chamber.'),
      capacity: z.number().describe('The capacity of the chamber in kg.'),
      occupied: z.number().describe('The currently occupied space in the chamber in kg.'),
      temperature: z.string().describe('The temperature of the chamber (e.g., 2-8°C).'),
    })
  ).describe('A list of available chambers.'),
});

export type OptimizeChamberPlacementInput = z.infer<
  typeof OptimizeChamberPlacementInputSchema
>;

const OptimizeChamberPlacementOutputSchema = z.array(
  z.object({
    itemName: z.string().describe('The name of the food item.'),
    chamberName: z.string().describe('The suggested chamber for the food item.'),
    quantity: z.number().describe('The quantity of this item to place in chamber.'),
    reason: z.string().describe('The reasoning behind this placement suggestion.'),
  })
);

export type OptimizeChamberPlacementOutput = z.infer<
  typeof OptimizeChamberPlacementOutputSchema
>;

export async function optimizeChamberPlacement(
  input: OptimizeChamberPlacementInput
): Promise<OptimizeChamberPlacementOutput> {
  return optimizeChamberPlacementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeChamberPlacementPrompt',
  input: {schema: OptimizeChamberPlacementInputSchema},
  output: {schema: OptimizeChamberPlacementOutputSchema},
  prompt: `You are an expert in optimizing food storage within chambers to minimize spoilage. Given a list of food items with their expiry dates, turnover rates, and quantities, and a list of chambers with their capacities, current occupancy, and temperatures, suggest the optimal placement for each food item.

Consider the following factors:

- **Expiry Dates:** Prioritize placing items with earlier expiry dates in locations where they are easily accessible to minimize the risk of them expiring before use.
- **Turnover Rates:** Place high-turnover items in easily accessible locations and low-turnover items in more remote locations.
- **Chamber Capacity:** Do not exceed the capacity of any chamber.  Consider that chambers are already partially occupied.
- **Temperature Requirements:** Ensure that food items are placed in chambers that meet their temperature requirements.

Items:
{{#each items}}
- Name: {{this.name}}, Expiry: {{this.expiryDate}}, Turnover: {{this.turnoverRate}}, Quantity: {{this.quantity}}
{{/each}}

Chambers:
{{#each chambers}}
- Name: {{this.name}}, Capacity: {{this.capacity}}, Occupied: {{this.occupied}}, Temperature: {{this.temperature}}
{{/each}}

Output the optimal chamber placement for each item and the reason for the suggestion.  Suggest the quantity to put in each chamber.  If an item does not fit in any chamber, suggest reducing the quantity ordered.  If there is not enough information available to make a determination, leave the suggestion blank.

Follow this JSON schema:
${JSON.stringify(OptimizeChamberPlacementOutputSchema.shape, null, 2)}`,
});

const optimizeChamberPlacementFlow = ai.defineFlow(
  {
    name: 'optimizeChamberPlacementFlow',
    inputSchema: OptimizeChamberPlacementInputSchema,
    outputSchema: OptimizeChamberPlacementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
