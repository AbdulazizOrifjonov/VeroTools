import { Slot } from 'radix-ui';
import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { cn } from '../lib/utils';
import { Label } from './label';

/** react-hook-form provider: `<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}>…` */
const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <FormFieldContext value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext>
  );
}

type FormItemContextValue = { id: string };

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState(fieldContext ? { name: fieldContext.name } : {});

  if (!fieldContext) throw new Error('useFormField() must be used within <FormField>.');
  if (!itemContext) throw new Error('useFormField() must be used within <FormItem>.');

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId();
  return (
    <FormItemContext value={{ id }}>
      <div data-slot="form-item" className={cn('grid min-w-0 content-start gap-2', className)} {...props} />
    </FormItemContext>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-danger', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

/** Wires id / aria-invalid / aria-describedby into the wrapped control. */
function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot.Root
      data-form-control=""
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-[13px] leading-snug text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Shows the field error message (translated by the app's schema) or `children`. */
function FormMessage({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? '') : children;
  if (!body) return null;
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role={error ? 'alert' : undefined}
      className={cn('animate-slide-down text-[13px] leading-snug font-medium text-danger', className)}
      {...props}
    >
      {body}
    </p>
  );
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
