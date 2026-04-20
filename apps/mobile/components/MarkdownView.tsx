import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

/**
 * Lightweight markdown renderer. Handles:
 *   - `#`, `##`, `###` headings
 *   - `**bold**`, `*italic*`
 *   - blank-line paragraph separation
 *   - `-` or `*` bullet lists
 *   - `> quote`
 * Links and images are not supported; raw URLs render as plain text.
 */
export function MarkdownView({ source }: { source: string }) {
  const blocks = splitBlocks(source);
  return (
    <View>
      {blocks.map((b, i) => renderBlock(b, i))}
    </View>
  );
}

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'quote'; text: string }
  | { type: 'list'; items: string[] };

function splitBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    if (/^###\s+/.test(line)) { blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') }); i++; continue; }
    if (/^##\s+/.test(line))  { blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });  i++; continue; }
    if (/^#\s+/.test(line))   { blocks.push({ type: 'h1', text: line.replace(/^#\s+/, '') });   i++; continue; }

    if (/^>\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s+/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: buf.join(' ') });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph — consume consecutive non-blank, non-heading lines
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,3}\s+/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && !/^>\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: para.join(' ') });
  }
  return blocks;
}

function renderBlock(b: Block, key: number) {
  if (b.type === 'h1') return <Text key={key} style={styles.h1}>{renderInline(b.text)}</Text>;
  if (b.type === 'h2') return <Text key={key} style={styles.h2}>{renderInline(b.text)}</Text>;
  if (b.type === 'h3') return <Text key={key} style={styles.h3}>{renderInline(b.text)}</Text>;
  if (b.type === 'quote') {
    return (
      <View key={key} style={styles.quote}>
        <Text style={styles.quoteText}>{renderInline(b.text)}</Text>
      </View>
    );
  }
  if (b.type === 'list') {
    return (
      <View key={key} style={styles.list}>
        {b.items.map((it, j) => (
          <View key={j} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{renderInline(it)}</Text>
          </View>
        ))}
      </View>
    );
  }
  return <Text key={key} style={styles.para}>{renderInline(b.text)}</Text>;
}

/** Parses **bold** and *italic* inline runs. */
function renderInline(text: string): React.ReactNode {
  const tokens = tokenize(text);
  return tokens.map((t, i) => {
    if (t.kind === 'bold') return <Text key={i} style={inlineBold}>{t.text}</Text>;
    if (t.kind === 'italic') return <Text key={i} style={inlineItalic}>{t.text}</Text>;
    return <Text key={i}>{t.text}</Text>;
  });
}

type Token = { kind: 'text' | 'bold' | 'italic'; text: string };

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[2] !== undefined) out.push({ kind: 'bold', text: m[2] });
    else if (m[4] !== undefined) out.push({ kind: 'italic', text: m[4] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

const baseText: TextStyle = {
  fontFamily: fontFamily.regular,
  fontSize: 15,
  lineHeight: 22,
  color: colors.textPrimary,
};

const inlineBold: TextStyle = { fontFamily: fontFamily.medium, fontWeight: '700' };
const inlineItalic: TextStyle = { fontStyle: 'italic' };

const styles = StyleSheet.create({
  h1: { fontFamily: fontFamily.medium, fontSize: 22, lineHeight: 28, color: colors.textPrimary, marginTop: 14, marginBottom: 8 },
  h2: { fontFamily: fontFamily.medium, fontSize: 18, lineHeight: 24, color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
  h3: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 22, color: colors.textPrimary, marginTop: 10, marginBottom: 4 },
  para: { ...baseText, marginBottom: 10 },
  list: { marginBottom: 10 },
  listItem: { flexDirection: 'row', marginBottom: 4 },
  bullet: { ...baseText, marginRight: 8, width: 12 },
  listText: { ...baseText, flex: 1 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: 12,
    marginBottom: 10,
  },
  quoteText: { ...baseText, color: colors.textSecondary, fontStyle: 'italic' },
});
