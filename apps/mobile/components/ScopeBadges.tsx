import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { ScopeCompany, ScopeTag } from '@/lib/queries';

const TAG_PALETTE = [
  { bg: '#EBF0E1', fg: '#3F5A1F' },
  { bg: '#E6EEF3', fg: '#1F4A66' },
  { bg: '#F4E7D8', fg: '#6E4919' },
  { bg: '#EFE3ED', fg: '#5A2857' },
  { bg: '#E1EEE9', fg: '#1F5A4A' },
  { bg: '#F3E6DF', fg: '#7A3F28' },
];

function tagColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

type Props = {
  everyone: boolean;
  companies: ScopeCompany[];
  tags: ScopeTag[];
  viewerCompanyId: string | null | undefined;
  viewerTagIds: string[];
};

export function ScopeBadges({ everyone, companies, tags, viewerCompanyId, viewerTagIds }: Props) {
  if (everyone) return null;

  const matchedCompany = viewerCompanyId
    ? companies.find((c) => c.id === viewerCompanyId)
    : undefined;
  const matchedTags = tags.filter((t) => viewerTagIds.includes(t.id));

  if (!matchedCompany && matchedTags.length === 0) return null;

  return (
    <View style={styles.row}>
      {matchedCompany ? (
        <View style={[styles.chip, styles.companyChip]}>
          <Text allowFontScaling={false} style={[type.badge, styles.companyText]}>
            {matchedCompany.name}
          </Text>
        </View>
      ) : null}
      {matchedTags.map((t) => {
        const c = tagColor(t.name);
        return (
          <View key={t.id} style={[styles.chip, { backgroundColor: c.bg }]}>
            <Text allowFontScaling={false} style={[type.badge, { color: c.fg }]}>
              {t.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
  },
  companyChip: {
    backgroundColor: colors.greenBadgeBg,
  },
  companyText: {
    color: colors.accentGreenDark,
  },
});
