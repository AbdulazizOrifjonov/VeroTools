import { translateValidation } from '@vero/i18n';
import { forwardRef, type ReactElement, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { PasswordField, PhoneField, TextField, type TextFieldProps } from './Input';

type Base<T extends FieldValues> = { control: Control<T>; name: Path<T> };

function useFieldError(message: string | undefined): string | undefined {
  const { t } = useTranslation();
  return translateValidation(t, message);
}

function ErrorText({
  message,
  children,
}: {
  message: string | undefined;
  children: (error: string | undefined) => ReactElement;
}) {
  return children(useFieldError(message));
}

type Kind = 'text' | 'password' | 'phone';

function makeField(kind: Kind) {
  return forwardRef(function FormField<T extends FieldValues>(
    { control, name, ...props }: Base<T> & Omit<TextFieldProps, 'value' | 'onChangeText'>,
    ref: Ref<TextInput>,
  ) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <ErrorText message={fieldState.error?.message}>
            {(error) =>
              kind === 'phone' ? (
                <PhoneField
                  ref={ref}
                  {...props}
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={error}
                />
              ) : kind === 'password' ? (
                <PasswordField
                  ref={ref}
                  {...props}
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={error}
                />
              ) : (
                <TextField
                  ref={ref}
                  {...props}
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={error}
                />
              )
            }
          </ErrorText>
        )}
      />
    );
  }) as <T extends FieldValues>(
    props: Base<T> & Omit<TextFieldProps, 'value' | 'onChangeText'> & { ref?: Ref<TextInput> },
  ) => ReactElement;
}

/** react-hook-form bound inputs; zod / server messages (i18n keys) are translated. */
export const FormTextField = makeField('text');
export const FormPasswordField = makeField('password');
export const FormPhoneField = makeField('phone');

export { useFieldError };
