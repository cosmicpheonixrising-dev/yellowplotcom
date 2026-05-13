import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiService = {
  async generateStoryIdea(prompt: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional story architect. Based on the prompt "${prompt}", generate a compelling story premise, some key plot points, and potential character archetypes. Format as Markdown.`,
    });
    return response.text;
  },

  async generateCharacter(concept: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed character profile for a story based on this concept: "${concept}". Include name, personality traits, motivations, and a transformative character arc. Format as Markdown.`,
    });
    return response.text;
  },

  async expandPlot(plotPoint: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Take this plot point: "${plotPoint}" and expand it into a detailed scene outline with emotional beats and sensory details.`,
    });
    return response.text;
  },

  async brainstormTitles(genre: string, theme: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 10 creative and catchy titles for a ${genre} story centered around the theme of "${theme}".`,
    });
    return response.text;
  },

  async writingAssistant(text: string, instruction: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `I am writing a story. Here is a snippet:\n\n"${text}"\n\nPlease help me with the following: ${instruction}. Focus on maintaining the tone and enhancing the prose.`,
    });
    return response.text;
  },

  async generatePlotOutline(premise: string, genre?: string, tone?: string) {
    const context = `Genre: ${genre || 'Unspecified'}, Tone: ${tone || 'Unspecified'}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a story architect. Given the story premise: "${premise}" and context: "${context}", generate a 5-point plot outline. 
      Return the result as a simple JSON array of objects with "title" and "description" fields. 
      Example: [{"title": "The Call", "description": "Protagonist receives a strange letter."}, ...]
      Do NOT include any other text, markdown formatting, or code blocks. Just the raw JSON array.`,
    });
    const text = response.text;
    // Strip possible markdown code blocks
    const cleanJson = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI plot outline:", text);
      return null;
    }
  },

  async expandPlotPoint(title: string, currentDescription: string, currentOutcomes: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a story consultant. I have a plot point titled "${title}".
      Current Description: "${currentDescription}"
      Current Key Outcomes: "${currentOutcomes}"
      
      Please expand on this. Provide a more detailed scene suggestion and deeper consequences/outcomes.
      Return the result as a JSON object with two fields: "expandedDescription" and "expandedOutcomes".
      Keep the tone consistent with a professional drafting tool.
      Do NOT include any other text, markdown formatting, or code blocks. Just the raw JSON object.`,
    });
    const text = response.text;
    const cleanJson = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI plot expansion:", text);
      return null;
    }
  },

  async chatWithCharacter(character: any, message: string, history: { role: string, text: string }[]) {
    const characterContext = `
      Name: ${character.name}
      Role: ${character.role}
      Description: ${character.description}
      Personality Traits: ${character.personalityTraits}
      Backstory: ${character.backstory}
      Arc: ${character.arc}
    `;

    const chatHistory = history.map(h => `${h.role === 'user' ? 'Writer' : character.name}: ${h.text}`).join('\n');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the character ${character.name} from a story.
      Character Context: ${characterContext}
      
      Conversation History:
      ${chatHistory}
      
      Writer: ${message}
      
      Response as ${character.name}:`,
    });
    return response.text;
  },

  async generateLore(storyContext: string, prompt: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a world-building assistant. Create a new lore entry for this story.
      Story Context: ${storyContext}
      User Request: ${prompt}
      
      Respond with a JSON object:
      {
        "title": "Short evocative title",
        "type": "Setting, Artifact, Mythos, Culture, or Species",
        "content": "Detailed evocative description (2-3 paragraphs)"
      }`,
    });
    
    const text = response.text;
    try {
      const cleaned = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse lore:", text);
      return null;
    }
  },

  async expandLore(entity: any, storyContext: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Expand on this lore entry to add depth and "world-feel".
      Story Context: ${storyContext}
      Existing Entry:
      Title: ${entity.title}
      Type: ${entity.type}
      Content: ${entity.content}
      
      Provide a significantly expanded and more detailed version of the "content" field only.`,
    });
    return response.text;
  },

  async generateCharacterProfile(storyContext: string, concept: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a character design expert. Create a new, highly detailed character profile based on the story context and a brief concept.
      Story Context: ${storyContext}
      Concept: ${concept}
      
      Respond with a JSON object:
      {
        "name": "Full character name",
        "role": "Detailed story role (e.g., The Reluctant Guardian)",
        "age": "Estimated age or lifecycle stage",
        "description": "One sentence iconic summation",
        "physicalDescription": "Detailed sensory description (eyes, clothing, posture)",
        "personalityTraits": "Nuaned description of their psyche",
        "traits": ["Tag", "Tag", "Tag"],
        "backstory": "Compelling 2-paragraph history",
        "relationships": "How they perceive their place in the world or known others",
        "arc": "The specific internal or external transformation they will face"
      }`,
    });
    
    const text = response.text;
    try {
      const cleaned = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse character profile:", text);
      return null;
    }
  },

  async generatePlotTwist(storyContext: string, plots: any[], characters: any[]) {
    const plotContext = plots.map((p, i) => `${i+1}. ${p.title}: ${p.description}`).join('\n');
    const charContext = characters.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a master of suspense and psychological thrillers. 
      Analyze the current story state and characters to suggest 3 potential "Plot Twists" that would subvert reader expectations.
      
      Story Context: ${storyContext}
      Existing Plot Points:
      ${plotContext}
      
      Characters:
      ${charContext}
      
      For each twist, provide:
      1. The Twist: A one-sentence reveal.
      2. The Setup: How the previous points were actually misdirections.
      3. The Consequence: How this changes everything for the protagonist.
      
      Return as a JSON array of objects:
      [
        { "twist": "...", "setup": "...", "consequence": "..." },
        ...
      ]
      Do NOT include markdown formatting or code blocks. Just the raw JSON.`,
    });
    
    const text = response.text;
    try {
      const cleaned = text.substring(text.indexOf('['), text.lastIndexOf(']') + 1);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse plot twists:", text);
      return null;
    }
  }
};
