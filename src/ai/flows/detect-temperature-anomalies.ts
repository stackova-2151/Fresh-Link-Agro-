// src/ai/flows/detect-temperature-anomalies.ts
'use server';
/**
 * @fileOverview Anomaly detection for temperature readings in storage chambers.
 *
 * - detectTemperatureAnomalies - A function that detects anomalies in temperature readings.
 * - DetectTemperatureAnomaliesInput - The input type for the detectTemperatureAnomalies function.
 * - DetectTemperatureAnomaliesOutput - The return type for the detectTemperatureAnomalies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectTemperatureAnomaliesInputSchema = z.object({
  chamberId: z.string().describe('The ID of the storage chamber.'),
  temperatureReadings: z
    .array(z.number())
    .describe('An array of recent temperature readings in Celsius.'),
  expectedTemperatureRange: z
    .string()
    .describe('The expected temperature range for the chamber, e.g., 2-8°C.'),
});

export type DetectTemperatureAnomaliesInput = z.infer<
  typeof DetectTemperatureAnomaliesInputSchema
>;

const DetectTemperatureAnomaliesOutputSchema = z.object({
  hasAnomaly: z.boolean().describe('Whether an anomaly is detected.'),
  anomalyDescription: z
    .string()
    .describe('A description of the anomaly, if any.'),
});

export type DetectTemperatureAnomaliesOutput = z.infer<
  typeof DetectTemperatureAnomaliesOutputSchema
>;

export async function detectTemperatureAnomalies(
  input: DetectTemperatureAnomaliesInput
): Promise<DetectTemperatureAnomaliesOutput> {
  return detectTemperatureAnomaliesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectTemperatureAnomaliesPrompt',
  input: {schema: DetectTemperatureAnomaliesInputSchema},
  output: {schema: DetectTemperatureAnomaliesOutputSchema},
  prompt: `You are an AI assistant specializing in detecting temperature anomalies in food storage chambers.

You are provided with recent temperature readings, the chamber ID, and the expected temperature range.

Your task is to analyze the temperature readings and determine if there is any anomaly.

Chamber ID: {{{chamberId}}}
Expected Temperature Range: {{{expectedTemperatureRange}}}
Temperature Readings: {{{temperatureReadings}}}

Respond with whether an anomaly is detected, and a brief description of the anomaly if any.

Consider these factors when detecting anomalies:
- Temperatures outside the expected range.
- Sudden or significant temperature changes.
- Consistent high or low temperatures.
`,
});

const detectTemperatureAnomaliesFlow = ai.defineFlow(
  {
    name: 'detectTemperatureAnomaliesFlow',
    inputSchema: DetectTemperatureAnomaliesInputSchema,
    outputSchema: DetectTemperatureAnomaliesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
