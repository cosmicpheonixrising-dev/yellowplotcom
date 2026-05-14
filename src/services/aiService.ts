async function callAI(action: string, params: Record<string, any>): Promise<any> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "AI request failed");
  }
  return response.json();
}

export const aiService = {
  async generateStoryIdea(prompt: string) {
    const { text } = await callAI("generateStoryIdea", { prompt });
    return text;
  },

  async generateCharacter(concept: string) {
    const { text } = await callAI("generateCharacter", { concept });
    return text;
  },

  async expandPlot(plotPoint: string) {
    const { text } = await callAI("expandPlot", { plotPoint });
    return text;
  },

  async brainstormTitles(genre: string, theme: string) {
    const { text } = await callAI("brainstormTitles", { genre, theme });
    return text;
  },

  async writingAssistant(text: string, instruction: string) {
    const result = await callAI("writingAssistant", { text, instruction });
    return result.text;
  },

  async generatePlotOutline(premise: string, genre?: string, tone?: string) {
    const { json } = await callAI("generatePlotOutline", { premise, genre, tone });
    return json;
  },

  async expandPlotPoint(title: string, currentDescription: string, currentOutcomes: string) {
    const { json } = await callAI("expandPlotPoint", { title, currentDescription, currentOutcomes });
    return json;
  },

  async chatWithCharacter(character: any, message: string, history: { role: string; text: string }[]) {
    const { text } = await callAI("chatWithCharacter", { character, message, history });
    return text;
  },

  async generateLore(storyContext: string, prompt: string) {
    const { json } = await callAI("generateLore", { storyContext, prompt });
    return json;
  },

  async expandLore(entity: any, storyContext: string) {
    const { text } = await callAI("expandLore", { entity, storyContext });
    return text;
  },

  async generateCharacterProfile(storyContext: string, concept: string) {
    const { json } = await callAI("generateCharacterProfile", { storyContext, concept });
    return json;
  },

  async generatePlotTwist(storyContext: string, plots: any[], characters: any[]) {
    const { json } = await callAI("generatePlotTwist", { storyContext, plots, characters });
    return json;
  },
};
