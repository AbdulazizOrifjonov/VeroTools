import { forwardRef, memo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { fonts } from '../theme/fonts';
import { makeStyles, useColors } from '../theme/theme';
import { Eye, EyeOff, X, type LucideIcon } from './icons';
import { Text } from './Text';

export interface FieldShellProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Label + control + error / hint. */
export const FieldShell = memo(function FieldShell({
  label,
  error,
  hint,
  required,
  optionalLabel,
  children,
  style,
}: FieldShellProps) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text variant="subhead" weight="semibold">
          {label}
          {required ? <Text color="danger"> *</Text> : null}
          {optionalLabel ? (
            <Text variant="subhead" color="mutedForeground">{` (${optionalLabel})`}</Text>
          ) : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text
          variant="footnote"
          color="danger"
          weight="medium"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" color="mutedForeground">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: string;
  icon?: LucideIcon;
  right?: ReactNode;
  clearable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
  prefix?: string;
}

const useStyles = makeStyles((t) => ({
  box: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.input,
    backgroundColor: t.dark ? t.colors.surface : t.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  focused: { borderColor: t.colors.link, borderWidth: 1.5 },
  invalid: { borderColor: t.colors.danger, borderWidth: 1.5 },
  disabled: { opacity: 0.6 },
  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: t.colors.foreground,
    // the field box draws the focus ring (web preview would add the browser outline on top)
    outlineWidth: 0,
  },
  multiline: { minHeight: 104, paddingTop: 12, textAlignVertical: 'top' },
  prefix: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: t.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
}));

/** Labelled single-line input with focus ring, error text and optional icon / clear button. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    error,
    hint,
    required,
    optionalLabel,
    icon: Icon,
    right,
    clearable,
    containerStyle,
    inputStyle,
    prefix,
    editable = true,
    multiline,
    onFocus,
    onBlur,
    value,
    onChangeText,
    ...rest
  },
  ref,
) {
  const s = useStyles();
  const c = useColors();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      optionalLabel={optionalLabel}
      style={containerStyle}
    >
      <View
        style={[
          s.box,
          multiline && { alignItems: 'flex-start' },
          focused && s.focused,
          !!error && s.invalid,
          !editable && s.disabled,
        ]}
      >
        {Icon ? <Icon size={18} color={c.mutedForeground} /> : null}
        {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={c.mutedForeground}
          selectionColor={c.link}
          cursorColor={c.link}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityHint={error ?? hint}
          maxFontSizeMultiplier={1.4}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[s.input, multiline && s.multiline, inputStyle]}
          {...rest}
        />
        {clearable && value ? (
          <Pressable
            onPress={() => onChangeText?.('')}
            accessibilityRole="button"
            accessibilityLabel={t('common:actions.clear')}
            hitSlop={10}
          >
            <X size={18} color={c.mutedForeground} />
          </Pressable>
        ) : null}
        {right}
      </View>
    </FieldShell>
  );
});

/** Password input with a show / hide toggle. */
export const PasswordField = forwardRef<TextInput, TextFieldProps>(function PasswordField(props, ref) {
  const { t } = useTranslation();
  const c = useColors();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <TextField
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      autoComplete="password"
      {...props}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('common:a11y.hidePassword') : t('common:a11y.showPassword')}
          hitSlop={12}
        >
          <Icon size={20} color={c.mutedForeground} />
        </Pressable>
      }
    />
  );
});

/** Local part digits (max 9) of any "+998 …" / "998…" / "90…" input. */
export function phoneDigits(value: string | undefined | null): string {
  let digits = (value ?? '').replace(/\D/g, '');
  if (digits.length > 9 && digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, 9);
}

/** "901234567" → "90 123 45 67" */
export function formatPhoneLocal(digits: string): string {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

export interface PhoneFieldProps extends Omit<TextFieldProps, 'value' | 'onChangeText' | 'prefix'> {
  /** "+998XXXXXXXXX" (or '' when empty) */
  value: string;
  onChangeText: (value: string) => void;
}

/** +998 phone input: fixed country prefix, "90 123 45 67" mask, value "+998901234567". */
export const PhoneField = forwardRef<TextInput, PhoneFieldProps>(function PhoneField(
  { value, onChangeText, ...rest },
  ref,
) {
  const digits = phoneDigits(value);
  return (
    <TextField
      ref={ref}
      prefix="+998"
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      placeholder="90 123 45 67"
      {...rest}
      value={formatPhoneLocal(digits)}
      onChangeText={(text) => {
        const next = phoneDigits(text);
        onChangeText(next ? `+998${next}` : '');
      }}
      inputStyle={{ fontVariant: ['tabular-nums'] }}
    />
  );
});
