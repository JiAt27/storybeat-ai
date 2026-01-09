
export enum AppView {
  AUTH = 'AUTH',
  INPUT = 'INPUT',
  STORYBOARD = 'STORYBOARD'
}

export enum AspectRatio {
  HORIZONTAL = '16:9',
  VERTICAL = '9:16'
}

export interface VisualStyle {
  id: string;
  name: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface SongAnalysis {
  genre: string;
  bpm: number;
  synopsis: string;
  characterDesign?: string;
  visualConsistencyGuide?: string;
  suggestedStyles: VisualStyle[];
}

export interface StoryboardScene {
  id: number;
  timestamp: string;
  lyrics: string;
  visualPrompt: string;
  videoPrompt: string;
  imageUrl?: string;
}

export interface Storyboard {
  scenes: StoryboardScene[];
  style: VisualStyle;
  orientation: AspectRatio;
}
