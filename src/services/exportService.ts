import { saveAs } from 'file-saver';
import { Character, Story, PlotPoint, TimelineEvent, Lore } from '../types/index';

export const exportService = {
  /**
   * Exports the story content as a Markdown file.
   */
  exportAsMarkdown(story: Story, characters: Character[], lores: Lore[]) {
    let md = `# ${story.title}\n\n`;
    md += `**Genre:** ${story.genre}\n`;
    md += `**Premise:** ${story.premise}\n\n`;
    md += `---` + `\n\n`;
    md += `## Manuscript\n\n${story.content || 'No content yet.'}\n\n`;
    
    if (characters.length > 0) {
      md += `\n\n## Characters\n\n`;
      characters.forEach(c => {
        md += `### ${c.name} (${c.role})\n`;
        md += `**Description:** ${c.description}\n`;
        md += `**Arc:** ${c.arc || 'Not defined'}\n\n`;
      });
    }

    if (lores.length > 0) {
      md += `\n\n## Lore & Codex\n\n`;
      lores.forEach(l => {
        md += `### ${l.title} (${l.type})\n`;
        md += `${l.content}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${story.title.replace(/\s+/g, '_')}_Manuscript.md`);
  },

  /**
   * Exports the entire project data as a JSON file.
   */
  exportAsJSON(story: Story, characters: Character[], plots: PlotPoint[], timelines: TimelineEvent[], lores: Lore[]) {
    const data = {
      exportedAt: new Date().toISOString(),
      story,
      characters,
      plots,
      timelines,
      lores
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `${story.title.replace(/\s+/g, '_')}_Archive.json`);
  },

  /**
   * Exports a structured text summary.
   */
  exportAsPlain(story: Story, characters: Character[], plots: PlotPoint[]) {
    let txt = `WORLD BUILDER ARCHIVE: ${story.title.toUpperCase()}\n`;
    txt += `==============================================\n\n`;
    txt += `SUMMARY:\n${story.premise}\n\n`;
    txt += `PLOT BEATS:\n`;
    plots.sort((a,b) => a.order - b.order).forEach((p, i) => {
      txt += `${i + 1}. ${p.title}: ${p.description}\n`;
    });
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${story.title.replace(/\s+/g, '_')}_Summary.txt`);
  }
};
