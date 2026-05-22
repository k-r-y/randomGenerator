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
