import { Text, TextProps } from 'react-native';
import { type } from '@/theme/typography';

export function SectionLabel({ children, style, ...rest }: TextProps) {
  return (
    <Text allowFontScaling={false} {...rest} style={[type.sectionLabel, style]}>
      {children}
    </Text>
  );
}
