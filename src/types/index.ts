export type SubscriptionTier = 'Starter' | 'Pro';

export interface UserProfile {
  uid: string;
  email: string;
  tier: SubscriptionTier;
  updatedAt: any;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  genre?: string;
  premise?: string;
  lastModified: number;
  content: string;
  type: StoryType;
  status: 'draft' | 'published' | 'archived';
  ownerId: string;
  dailyGoal?: number;
  createdAt: any;
  updatedAt: any;
}

export interface Lore {
  id: string;
  storyId: string;
  ownerId: string;
  title: string;
  content: string;
  type: string;
  createdAt: any;
}

export type StoryType = 'Novel' | 'Script' | 'Book' | 'Short Story';

export interface Relationship {
  id: string;
  storyId: string;
  ownerId: string;
  sourceId: string;
  targetId: string;
  type: string; // e.g., "Parent", "Rival", "Lover"
  strength: number; // 1-5
  notes?: string;
}

export interface Character {
  id: string;
  storyId: string;
  ownerId: string;
  name: string;
  role: string;
  age?: string;
  backstory?: string;
  personalityTraits?: string;
  physicalDescription?: string;
  relationships?: string;
  description: string;
  traits: string[];
  arc: string;
}

export interface PlotPoint {
  id: string;
  storyId: string;
  ownerId: string;
  title: string;
  description: string;
  setting?: string;
  charactersInvolved?: string;
  characterIds?: string[];
  momentType?: 'Conflict' | 'Decision' | 'Shift' | 'Climax' | 'Resolution';
  impact?: number; // 1-5 for narrative weight
  keyOutcomes?: string;
  order: number;
  chapter?: number;
}

export interface TimelineEvent {
  id: string;
  storyId: string;
  date: string;
  event: string;
  characterIds?: string[];
  order: number;
}
