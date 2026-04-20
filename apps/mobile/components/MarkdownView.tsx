import { Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

/**
 * Renders markdown. Uses react-native-markdown-display (CommonMark + GFM):
 * headings h1–h6, paragraphs, bold, italic, strikethrough, inline code,
 * fenced code blocks, ordered + unordered + task + nested lists, block
 * quotes, tables, horizontal rules, links, images, autolinking.
 * Tapping a link opens it in the system browser.
 */
export function MarkdownView({ source }: { source: string }) {
  return (
    <Markdown
      style={markdownStyles}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => {});
        return false;
      }}
    >
      {source}
    </Markdown>
  );
}

const baseText = {
  fontFamily: fontFamily.regular,
  fontSize: 15,
  lineHeight: 22,
  color: colors.textPrimary,
};

const markdownStyles = {
  body:           baseText,
  paragraph:      { ...baseText, marginTop: 0, marginBottom: 10 },
  heading1:       { fontFamily: fontFamily.medium, fontSize: 24, lineHeight: 30, color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
  heading2:       { fontFamily: fontFamily.medium, fontSize: 20, lineHeight: 26, color: colors.textPrimary, marginTop: 14, marginBottom: 8 },
  heading3:       { fontFamily: fontFamily.medium, fontSize: 17, lineHeight: 23, color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
  heading4:       { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 21, color: colors.textPrimary, marginTop: 10, marginBottom: 4 },
  heading5:       { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, color: colors.textPrimary, marginTop: 10, marginBottom: 4 },
  heading6:       { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 10, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  strong:         { fontFamily: fontFamily.medium, fontWeight: '700' as const },
  em:             { fontStyle: 'italic' as const },
  s:              { textDecorationLine: 'line-through' as const, color: colors.textSecondary },
  link:           { color: colors.accentGreen, textDecorationLine: 'underline' as const },
  blockquote:     {
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: 12,
    paddingVertical: 2,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  code_inline:    {
    fontFamily: 'Courier',
    fontSize: 13,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block:     {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 0,
  },
  fence:          {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 0,
  },
  bullet_list:    { marginBottom: 10 },
  ordered_list:   { marginBottom: 10 },
  list_item:      { ...baseText, marginBottom: 4 },
  bullet_list_icon:  { ...baseText, marginLeft: 0, marginRight: 8, lineHeight: 22 },
  ordered_list_icon: { ...baseText, marginLeft: 0, marginRight: 8, lineHeight: 22 },
  hr:             { backgroundColor: colors.border, height: 1, marginVertical: 14 },
  table:          { borderWidth: 1, borderColor: colors.border, borderRadius: 6, marginBottom: 10, overflow: 'hidden' as const },
  thead:          { backgroundColor: colors.surfaceRaised },
  tbody:          {},
  th:             { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
  tr:             { flexDirection: 'row' as const, borderBottomWidth: 0 },
  td:             { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
  image:          { borderRadius: 6, marginVertical: 8 },
};
