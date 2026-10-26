export type DescriptionInlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'emphasis'; value: string }
  | { kind: 'underline'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; value: string; href: string };

export type DescriptionBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: Array<{ level: number; text: string }> };

const inlinePattern = /(\*([^*]+)\*|_([^_]+)_|\+([^+]+)\+|@([^@]+)@|"([^"]+)":(https?:\/\/[^\s]+)|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;

export function parseDescriptionInline(value: string): DescriptionInlineToken[] {
  const tokens: DescriptionInlineToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(inlinePattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ kind: 'text', value: value.slice(cursor, index) });
    if (match[2]) tokens.push({ kind: 'strong', value: match[2] });
    else if (match[3]) tokens.push({ kind: 'emphasis', value: match[3] });
    else if (match[4]) tokens.push({ kind: 'underline', value: match[4] });
    else if (match[5]) tokens.push({ kind: 'code', value: match[5] });
    else if (match[6] && match[7]) tokens.push({ kind: 'link', value: match[6], href: match[7] });
    else if (match[8] && match[9]) tokens.push({ kind: 'link', value: match[8], href: match[9] });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) tokens.push({ kind: 'text', value: value.slice(cursor) });
  return tokens.length ? tokens : [{ kind: 'text', value }];
}

export function parseRedmineDescription(value: string): DescriptionBlock[] {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let list: Extract<DescriptionBlock, { kind: 'list' }> | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^h([1-6])\.\s+(.+)$/i);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'heading', level: Number(heading[1]), text: heading[2] });
      continue;
    }
    const item = line.match(/^(\*+|#+)\s+(.+)$/);
    if (item) {
      flushParagraph();
      const ordered = item[1].startsWith('#');
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { kind: 'list', ordered, items: [] };
      }
      list.items.push({ level: item[1].length, text: item[2] });
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
