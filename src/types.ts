export const MAX_CHOICES = 100;

export interface Choice {
  id: string;
  text: string;
  color: string;
  weight: number;
}

export interface DrawResult {
  id: string;
  choice: Choice;
  generator: string;
  timestamp: number;
}

export type GeneratorType = 'roulette' | 'duck' | 'slot' | 'plinko' | 'claw';
