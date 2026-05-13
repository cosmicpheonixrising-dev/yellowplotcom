export interface PlotTemplate {
  name: string;
  description: string;
  beats: { title: string; description: string; order: number; type: string }[];
}

export const STORY_TEMPLATES: PlotTemplate[] = [
  {
    name: "Three-Act Structure",
    description: "The classic storytelling framework consisting of Setup, Confrontation, and Resolution.",
    beats: [
      { title: "The Setup", description: "Introduce the world, the protagonist, and the status quo.", order: 0, type: "Act I" },
      { title: "Inciting Incident", description: "An event that disrupts the protagonist's world and starts the journey.", order: 1, type: "Act I" },
      { title: "Plot Point 1", description: "A major event that pushes the story into the second act.", order: 2, type: "Act II" },
      { title: "Rising Action", description: "Escalating conflict and obstacles for the protagonist.", order: 3, type: "Act II" },
      { title: "Midpoint", description: "A significant shift or revelation that raises the stakes.", order: 4, type: "Act II" },
      { title: "Plot Point 2", description: "The lowest point for the hero, leading to the final confrontation.", order: 5, type: "Act III" },
      { title: "Climax", description: "The peak of the story's conflict where the protagonist faces the antagonist.", order: 6, type: "Act III" },
      { title: "Resolution", description: "The aftermath and the establishment of a new normal.", order: 7, type: "Act III" }
    ]
  },
  {
    name: "Hero's Journey",
    description: "Monomyth structure focusing on the protagonist's transformation and return.",
    beats: [
      { title: "Ordinary World", description: "The hero's starting point before the adventure begins.", order: 0, type: "Departure" },
      { title: "Call to Adventure", description: "The challenge or quest is presented.", order: 1, type: "Departure" },
      { title: "Refusal of the Call", description: "The hero hesitates or expresses fear about the journey.", order: 2, type: "Departure" },
      { title: "Meeting the Mentor", description: "Assistance or guidance is provided by a seasoned figure.", order: 3, type: "Departure" },
      { title: "Crossing the Threshold", description: "Committing to the adventure and entering the unknown world.", order: 4, type: "Departure" },
      { title: "Tests, Allies, Enemies", description: "The hero faces trials and meets key characters.", order: 5, type: "Initiation" },
      { title: "Approach to the Inmost Cave", description: "Preparing for the main challenge.", order: 6, type: "Initiation" },
      { title: "The Ordeal", description: "The hero faces their greatest fear or crisis.", order: 7, type: "Initiation" },
      { title: "The Reward", description: "The hero gains a treasure or knowledge.", order: 8, type: "Initiation" },
      { title: "The Road Back", description: "Returning to the ordinary world with the prize.", order: 9, type: "Return" },
      { title: "Resurrection", description: "A final test where the hero is transformed.", order: 10, type: "Return" },
      { title: "Return with the Elixir", description: "Bringing back something to help the ordinary world.", order: 11, type: "Return" }
    ]
  },
  {
    name: "Noir / Hardboiled",
    description: "Gritty mystery structure focusing on investigations, double-crosses, and moral ambiguity.",
    beats: [
      { title: "The Client / The Corpse", description: "A detective is hired or a crime is discovered.", order: 0, type: "Investigation" },
      { title: "The First Clue", description: "Initial investigation leads to a suspicious character.", order: 1, type: "Investigation" },
      { title: "The Femme Fatale / Dark Ally", description: "A dangerous and alluring character enters the scene.", order: 2, type: "Investigation" },
      { title: "The Beating / The Warning", description: "Powerful forces tell the detective to drop the case.", order: 3, type: "Complication" },
      { title: "The Double Cross", description: "A trusted ally betrays the protagonist.", order: 4, type: "Complication" },
      { title: "The Smoke-Filled Revelation", description: "Connecting the dots in a dramatic breakthrough.", order: 5, type: "Climax" },
      { title: "The Final Shootout", description: "Dealing with the antagonist in a gritty showdown.", order: 6, type: "Climax" },
      { title: "The Bitter End", description: "The case is 'solved' but at a heavy personal cost.", order: 7, type: "Epilogue" }
    ]
  }
];
