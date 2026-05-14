import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3-flash-preview";

function getAI() {
  const apiKey = Netlify.env.get("GEMINI_API_KEY") || "";
  return new GoogleGenAI({ apiKey });
}

async function generate(contents: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({ model: MODEL, contents });
  return response.text ?? "";
}

const handlers: Record<string, (body: any) => Promise<any>> = {
  async generateStoryIdea({ prompt }) {
    return { text: await generate(`You are a professional story architect. Based on the prompt "${prompt}", generate a compelling story premise, some key plot points, and potential character archetypes. Format as Markdown.`) };
  },

  async generateCharacter({ concept }) {
    return { text: await generate(`Generate a detailed character profile for a story based on this concept: "${concept}". Include name, personality traits, motivations, and a transformative character arc. Format as Markdown.`) };
  },

  async expandPlot({ plotPoint }) {
    return { text: await generate(`Take this plot point: "${plotPoint}" and expand it into a detailed scene outline with emotional beats and sensory details.`) };
  },

  async brainstormTitles({ genre, theme }) {
    return { text: await generate(`Provide 10 creative and catchy titles for a ${genre} story centered around the theme of "${theme}".`) };
  },

  async writingAssistant({ text, instruction }) {
    return { text: await generate(`I am writing a story. Here is a snippet:\n\n"${text}"\n\nPlease help me with the following: ${instruction}. Focus on maintaining the tone and enhancing the prose.`) };
  },

  async generatePlotOutline({ premise, genre, tone }) {
    const context = `Genre: ${genre || "Unspecified"}, Tone: ${tone || "Unspecified"}`;
    const raw = await generate(`You are a story architect. Given the story premise: "${premise}" and context: "${context}", generate a 5-point plot outline.
      Return the result as a simple JSON array of objects with "title" and "description" fields.
      Example: [{"title": "The Call", "description": "Protagonist receives a strange letter."}, ...]
      Do NOT include any other text, markdown formatting, or code blocks. Just the raw JSON array.`);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try { return { json: JSON.parse(cleaned) }; } catch { return { json: null }; }
  },

  async expandPlotPoint({ title, currentDescription, currentOutcomes }) {
    const raw = await generate(`You are a story consultant. I have a plot point titled "${title}".
      Current Description: "${currentDescription}"
      Current Key Outcomes: "${currentOutcomes}"

      Please expand on this. Provide a more detailed scene suggestion and deeper consequences/outcomes.
      Return the result as a JSON object with two fields: "expandedDescription" and "expandedOutcomes".
      Keep the tone consistent with a professional drafting tool.
      Do NOT include any other text, markdown formatting, or code blocks. Just the raw JSON object.`);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try { return { json: JSON.parse(cleaned) }; } catch { return { json: null }; }
  },

  async chatWithCharacter({ character, message, history }) {
    const characterContext = `
      Name: ${character.name}
      Role: ${character.role}
      Description: ${character.description}
      Personality Traits: ${character.personalityTraits}
      Backstory: ${character.backstory}
      Arc: ${character.arc}
    `;
    const chatHistory = history.map((h: any) => `${h.role === "user" ? "Writer" : character.name}: ${h.text}`).join("\n");
    return { text: await generate(`You are the character ${character.name} from a story.
      Character Context: ${characterContext}

      Conversation History:
      ${chatHistory}

      Writer: ${message}

      Response as ${character.name}:`) };
  },

  async generateLore({ storyContext, prompt }) {
    const raw = await generate(`You are a world-building assistant. Create a new lore entry for this story.
      Story Context: ${storyContext}
      User Request: ${prompt}

      Respond with a JSON object:
      {
        "title": "Short evocative title",
        "type": "Setting, Artifact, Mythos, Culture, or Species",
        "content": "Detailed evocative description (2-3 paragraphs)"
      }`);
    try {
      const cleaned = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      return { json: JSON.parse(cleaned) };
    } catch { return { json: null }; }
  },

  async expandLore({ entity, storyContext }) {
    return { text: await generate(`Expand on this lore entry to add depth and "world-feel".
      Story Context: ${storyContext}
      Existing Entry:
      Title: ${entity.title}
      Type: ${entity.type}
      Content: ${entity.content}

      Provide a significantly expanded and more detailed version of the "content" field only.`) };
  },

  async generateCharacterProfile({ storyContext, concept }) {
    const raw = await generate(`You are a character design expert. Create a new, highly detailed character profile based on the story context and a brief concept.
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
      }`);
    try {
      const cleaned = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      return { json: JSON.parse(cleaned) };
    } catch { return { json: null }; }
  },

  async generatePlotTwist({ storyContext, plots, characters }) {
    const plotContext = plots.map((p: any, i: number) => `${i + 1}. ${p.title}: ${p.description}`).join("\n");
    const charContext = characters.map((c: any) => `- ${c.name} (${c.role}): ${c.description}`).join("\n");
    const raw = await generate(`You are a master of suspense and psychological thrillers.
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
      Do NOT include markdown formatting or code blocks. Just the raw JSON.`);
    try {
      const cleaned = raw.substring(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      return { json: JSON.parse(cleaned) };
    } catch { return { json: null }; }
  },
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { action, params } = await req.json();

  const handler = handlers[action];
  if (!handler) {
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    const result = await handler(params);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config = {
  path: "/api/ai",
  method: "POST",
};
