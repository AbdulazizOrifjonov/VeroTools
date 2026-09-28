import { useSession } from '@vero/api-client';
import { Button, Form } from '@vero/ui';
import { checkoutCustomerSchema } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PhoneField, TextField } from '../../components/form/fields';
import type { CheckoutDraft } from './state';

export function ContactStep({
  draft,
  update,
  onNext,
  serverFields,
}: {
  draft: CheckoutDraft;
  update: (patch: Partial<CheckoutDraft> | ((d: CheckoutDraft) => Partial<CheckoutDraft>)) => void;
  onNext: () => void;
  serverFields?: Record<string, string>;
}) {
  const { t } = useTranslation();
  const { user } = useSession();
  const form = useForm({
    resolver: zodResolver(checkoutCustomerSchema),
    defaultValues: draft.customer ?? {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    },
  });

  // keep the draft in sync while typing (a reload keeps the entered data)
  useEffect(() => {
    const sub = form.watch((v) =>
      update({ customer: { firstName: v.firstName ?? '', lastName: v.lastName ?? '', phone: v.phone ?? '', email: v.email ?? '' } }),
    );
    return () => sub.unsubscribe();
  }, [form, update]);

  useEffect(() => {
    if (!serverFields) return;
    for (const [key, message] of Object.entries(serverFields)) {
      const name = key.replace(/^customer\./, '') as 'firstName' | 'lastName' | 'phone' | 'email';
      if (['firstName', 'lastName', 'phone', 'email'].includes(name)) form.setError(name, { type: 'server', message }, { shouldFocus: true });
    }
  }, [serverFields, form]);

  const submit = form.handleSubmit((values) => {
    update({ customer: { firstName: values.firstName, lastName: values.lastName, phone: values.phone, email: values.email ?? '' } });
    onNext();
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t('shop:checkout.customerTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('shop:checkout.customerHint')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="firstName" label={t('shop:fields.firstName')} required autoComplete="given-name" maxLength={60} />
          <TextField control={form.control} name="lastName" label={t('shop:fields.lastName')} required autoComplete="family-name" maxLength={60} />
          <PhoneField control={form.control} name="phone" label={t('shop:fields.phone')} required />
          <TextField control={form.control} name="email" type="email" label={t('shop:fields.emailOptional')} autoComplete="email" maxLength={120} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" rightIcon={<ArrowRightIcon aria-hidden="true" />}>
            {t('common:actions.continue')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
