export interface LanguageEstimate { name: string; tag: string; confidence: number; basis: string }

export function detectLyricsLanguage(text: string): LanguageEstimate {
  const value = text.trim();
  if (!value) return { name: 'Not detected', tag: 'und', confidence: 0, basis: 'Add text to estimate its language.' };
  const count = (pattern: RegExp) => (value.match(pattern) || []).length;
  const total = Math.max(1, count(/\S/g));
  const scripts = [
    { name: 'Bengali', tag: 'bn', count: count(/[\u0980-\u09FF]/g) },
    { name: 'Arabic', tag: 'ar', count: count(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) },
    { name: 'Devanagari (likely Hindi)', tag: 'hi', count: count(/[\u0900-\u097F]/g) },
  ].sort((a, b) => b.count - a.count);
  if (scripts[0].count > 0) {
    const share = scripts[0].count / total;
    return { name: scripts[0].name, tag: scripts[0].tag, confidence: Math.min(.99, .7 + share * .29), basis: 'Estimated from the writing system; this does not verify the lyric language.' };
  }
  const words = value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]+/g) || [];
  const lexicons: Array<{ name: string; tag: string; words: string[] }> = [
    { name: 'Spanish (likely)', tag: 'es', words: ['que', 'de', 'la', 'el', 'y', 'en', 'por', 'para', 'con', 'una', 'mi', 'amor', 'corazon'] },
    { name: 'English (likely)', tag: 'en', words: ['the', 'and', 'you', 'that', 'this', 'with', 'for', 'are', 'was', 'love', 'my', 'your'] },
  ];
  const ranked = lexicons.map((item) => ({ ...item, hits: words.filter((word) => item.words.includes(word)).length })).sort((a, b) => b.hits - a.hits);
  const best = ranked[0];
  if (best.hits >= 2 && best.hits > (ranked[1]?.hits || 0)) return { name: best.name, tag: best.tag, confidence: Math.min(.8, .5 + best.hits * .06), basis: 'Low-confidence word-pattern estimate; short lyrics and names are ambiguous.' };
  return { name: 'Latin script; language uncertain', tag: 'und', confidence: .25, basis: 'Text alone does not provide enough evidence to distinguish English, Spanish, or another Latin-script language.' };
}
