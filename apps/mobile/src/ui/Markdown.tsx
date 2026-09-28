import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { fonts } from '../theme/fonts';
import { useTheme } from '../theme/theme';
import { Text } from './Text';

/* ------------------------------------------------------------------ */
/* Parser (subset of CommonMark used by the admin panel content)        */
/* ------------------------------------------------------------------ */

type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] };

type Block =
  | { type: 'heading'; level: number; inline: Inline[] }
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { type: 'quote'; inline: Inline[] }
  | { type: 'hr' }
  | { type: 'code'; text: string };

const INLINE_RE =
  /(\*\*|__)(.+?)\1|(\*|_)(?!\s)([^*_\n]*[^*_\s])\3|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  while (rest.length) {
    const m = INLINE_RE.exec(rest);
    if (!m) {
      out.push({ type: 'text', text: rest });
      break;
    }
    if (m.index > 0) out.push({ type: 'text', text: rest.slice(0, m.index) });
    if (m[1]) out.push({ type: 'bold', children: parseInline(m[2]!) });
    else if (m[3]) {
      // "_" inside words (snake_case) is not emphasis
      const before = rest[m.index - 1];
      if (m[3] === '_' && before && /\w/.test(before)) out.push({ type: 'text', text: m[0] });
      else out.push({ type: 'italic', children: parseInline(m[4]!) });
    } else if (m[5] !== undefined) out.push({ type: 'code', text: m[5] });
    else if (m[6] !== undefined) out.push({ type: 'link', href: m[7]!, children: parseInline(m[6]) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;
  let code: string[] | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: 'paragraph', inline: parseInline(para.join(' ').trim()) });
    para = [];
  };
  const flushList = () => {
    if (list)
      blocks.push({
        type: 'list',
        ordered: list.ordered,
        start: list.start,
        items: list.items.map((i) => parseInline(i.trim())),
      });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '    ');
    if (code) {
      if (/^\s*```/.test(line)) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else code.push(raw);
      continue;
    }
    if (/^\s*```/.test(line)) {
      flushPara();
      flushList();
      code = [];
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      blocks.push({ type: 'heading', level: h[1]!.length, inline: parseInline(h[2]!) });
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    const ul = /^\s{0,3}[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, start: ol ? Number(ol[1]) : 1, items: [] };
      }
      list.items.push((ul ? ul[1] : ol![2])!);
      continue;
    }
    const q = /^\s{0,3}>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      blocks.push({ type: 'quote', inline: parseInline(q[1]!) });
      continue;
    }
    if (list && /^\s{2,}\S/.test(line)) {
      // continuation of the previous list item
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  if (code) blocks.push({ type: 'code', text: (code as string[]).join('\n') });
  flushPara();
  flushList();
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

export interface MarkdownProps {
  children: string;
  onLinkPress?: (href: string) => void;
  style?: StyleProp<ViewStyle>;
  /** base font size */
  size?: 'sm' | 'md';
}

/** Markdown from the admin panel (product descriptions, content pages): headings, lists, bold, links. */
export const Markdown = memo(function Markdown({ children, onLinkPress, style, size = 'md' }: MarkdownProps) {
  const { colors } = useTheme();
  const blocks = useMemo(() => parseMarkdown(children ?? ''), [children]);
  const base: TextStyle = {
    fontFamily: fonts.regular,
    fontSize: size === 'sm' ? 14 : 15,
    lineHeight: size === 'sm' ? 21 : 23,
    color: colors.foreground,
  };

  const renderInline = (nodes: Inline[], keyPrefix = ''): ReactNode[] =>
    nodes.map((n, i) => {
      const key = `${keyPrefix}${i}`;
      switch (n.type) {
        case 'text':
          return n.text;
        case 'bold':
          return (
            <Text key={key} style={{ fontFamily: fonts.bold }}>
              {renderInline(n.children, `${key}-`)}
            </Text>
          );
        case 'italic':
          return (
            <Text key={key} style={{ fontStyle: 'italic' }}>
              {renderInline(n.children, `${key}-`)}
            </Text>
          );
        case 'code':
          return (
            <Text key={key} style={{ fontFamily: fonts.semibold, backgroundColor: colors.fill }}>
              {n.text}
            </Text>
          );
        case 'link':
          return (
            <Text
              key={key}
              accessibilityRole="link"
              onPress={onLinkPress ? () => onLinkPress(n.href) : undefined}
              style={{ color: colors.link, fontFamily: fonts.semibold, textDecorationLine: 'underline' }}
            >
              {renderInline(n.children, `${key}-`)}
            </Text>
          );
        default:
          return null;
      }
    });

  return (
    <View style={[styles.root, style]}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return (
              <Text
                key={i}
                accessibilityRole="header"
                variant={b.level <= 2 ? 'title3' : b.level === 3 ? 'headline' : 'subhead'}
                weight="bold"
                style={i > 0 ? styles.headingGap : null}
              >
                {renderInline(b.inline)}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={i} style={base}>
                {renderInline(b.inline)}
              </Text>
            );
          case 'quote':
            return (
              <View
                key={i}
                style={[styles.quote, { borderLeftColor: colors.primary, backgroundColor: colors.fill }]}
              >
                <Text style={[base, { color: colors.mutedForeground }]}>{renderInline(b.inline)}</Text>
              </View>
            );
          case 'hr':
            return <View key={i} style={[styles.hr, { backgroundColor: colors.border }]} />;
          case 'code':
            return (
              <View key={i} style={[styles.code, { backgroundColor: colors.fill }]}>
                <Text style={[base, { fontFamily: fonts.medium, fontSize: 13 }]}>{b.text}</Text>
              </View>
            );
          case 'list':
            return (
              <View key={i} style={styles.list} accessibilityRole="list">
                {b.items.map((item, j) => (
                  <View key={j} style={styles.item}>
                    <Text
                      style={[base, styles.marker, { color: b.ordered ? colors.foreground : colors.link }]}
                      tabular
                    >
                      {b.ordered ? `${b.start + j}.` : '•'}
                    </Text>
                    <Text style={[base, styles.itemText]}>{renderInline(item, `${j}-`)}</Text>
                  </View>
                ))}
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: 10 },
  headingGap: { marginTop: 10 },
  quote: { borderLeftWidth: 3, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  code: { padding: 12, borderRadius: 8 },
  list: { gap: 6 },
  item: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  marker: { minWidth: 18, fontFamily: fonts.bold },
  itemText: { flex: 1 },
});
