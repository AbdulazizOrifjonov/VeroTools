import { useAddresses, useDeleteAddress, useSaveAddress, useSession, useSetDefaultAddress } from '@vero/api-client';
import { LIMITS } from '@vero/config';
import type { AddressDTO } from '@vero/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Form,
  Skeleton,
  toast,
} from '@vero/ui';
import { addressSchema, type AddressInput } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPinIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../components/common/states';
import { CheckboxField, PhoneField, TextField } from '../../components/form/fields';
import { AccountHeading } from '../../features/account/AccountSection';
import { AddressFields, formatAddress } from '../../features/address/address';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { useLang } from '../../hooks/use-lang';
import { handleFormError } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';

type Editing = { mode: 'create' } | { mode: 'edit'; address: AddressDTO };

function toFormValues(a: AddressDTO | null, fallback: { firstName: string; lastName: string; phone: string }, makeDefault: boolean): AddressInput {
  return {
    label: a?.label ?? '',
    firstName: a?.firstName ?? fallback.firstName,
    lastName: a?.lastName ?? fallback.lastName,
    phone: a?.phone ?? fallback.phone,
    region: a?.region ?? '',
    city: a?.city ?? '',
    district: a?.district ?? '',
    street: a?.street ?? '',
    house: a?.house ?? '',
    apartment: a?.apartment ?? '',
    comment: a?.comment ?? '',
    isDefault: a?.isDefault ?? makeDefault,
  };
}

function AddressDialog({ editing, onClose, count }: { editing: Editing | null; onClose: () => void; count: number }) {
  return (
    <Dialog open={!!editing} onOpenChange={(open) => !open && onClose()}>
      {editing ? <AddressFormContent key={editing.mode === 'edit' ? editing.address.id : 'new'} editing={editing} onClose={onClose} count={count} /> : null}
    </Dialog>
  );
}

const OPTIONAL_FIELDS = ['label', 'district', 'apartment', 'comment'] as const;

/** Mounted per opened address, so the region → city reset of <AddressFields> only reacts to user changes. */
function AddressFormContent({ editing, onClose, count }: { editing: Editing; onClose: () => void; count: number }) {
  const { t } = useTranslation();
  const { user } = useSession();
  const save = useSaveAddress();
  const remove = useDeleteAddress();
  const address = editing.mode === 'edit' ? editing.address : null;
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: toFormValues(address, { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' }, count === 0),
  });
  const busy = save.isPending || remove.isPending;

  const submit = form.handleSubmit(async (values) => {
    try {
      const clearsOptional = !!address && OPTIONAL_FIELDS.some((k) => !!address[k] && !String(values[k] ?? '').trim());
      if (address && clearsOptional) {
        // PATCH /addresses/:id only $sets the keys it receives, so an emptied optional field would silently
        // survive — replace the address instead (the default flag is kept).
        const replacement: AddressInput = { ...values, isDefault: address.isDefault || !!values.isDefault };
        if (count < LIMITS.addressesMax) {
          await save.mutateAsync({ input: replacement });
          await remove.mutateAsync(address.id);
        } else {
          await remove.mutateAsync(address.id);
          await save.mutateAsync({ input: replacement });
        }
      } else {
        // "default" can only be switched on here (another address becomes default instead of none)
        await save.mutateAsync({ id: address?.id, input: { ...values, isDefault: values.isDefault ? true : undefined } });
      }
      toast.success(t('shop:addresses.saved'));
      onClose();
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <DialogContent
      closeLabel={t('common:actions.close')}
      size="lg"
      onInteractOutside={(e) => busy && e.preventDefault()}
      onEscapeKeyDown={(e) => busy && e.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle>{address ? t('shop:addresses.edit') : t('shop:addresses.add')}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form id="address-form" onSubmit={submit} className="contents" noValidate>
          <DialogBody className="flex flex-col gap-4 py-1">
            <TextField control={form.control} name="label" label={t('shop:fields.label')} maxLength={40} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="firstName" label={t('shop:fields.firstName')} required autoComplete="given-name" maxLength={60} />
              <TextField control={form.control} name="lastName" label={t('shop:fields.lastName')} required autoComplete="family-name" maxLength={60} />
              <PhoneField control={form.control} name="phone" label={t('shop:fields.phone')} required className="sm:col-span-2" />
            </div>
            <AddressFields control={form.control} setValue={form.setValue} />
            {address?.isDefault ? null : <CheckboxField control={form.control} name="isDefault" label={t('shop:addresses.makeDefault')} />}
          </DialogBody>
        </form>
      </Form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {t('common:actions.cancel')}
        </Button>
        <Button type="submit" form="address-form" loading={busy}>
          {t('common:actions.save')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddressCard({ address, onEdit, onDelete }: { address: AddressDTO; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useLang();
  const setDefault = useSetDefaultAddress();
  const title = address.label || `${address.firstName} ${address.lastName}`;

  const makeDefault = async () => {
    try {
      await setDefault.mutateAsync(address.id);
      toast.success(t('common:status.saved'));
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <MapPinIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-bold">{title}</h2>
        {address.isDefault ? (
          <Badge variant="brand" size="sm">
            {t('shop:addresses.default')}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 text-sm">
        <p>{formatAddress(address, lang, t)}</p>
        <p className="text-muted-foreground tabular-nums">
          {address.firstName} {address.lastName} · {f.phone(address.phone)}
        </p>
        {address.comment ? <p className="text-muted-foreground">{address.comment}</p> : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" onClick={onEdit} leftIcon={<PencilIcon aria-hidden="true" />} aria-label={`${t('common:actions.edit')}: ${title}`}>
          {t('common:actions.edit')}
        </Button>
        {!address.isDefault ? (
          <Button variant="ghost" size="sm" onClick={() => void makeDefault()} loading={setDefault.isPending} leftIcon={<StarIcon aria-hidden="true" />}>
            {t('shop:addresses.makeDefault')}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="ms-auto text-danger hover:bg-danger-soft hover:text-danger"
          leftIcon={<Trash2Icon aria-hidden="true" />}
          aria-label={`${t('common:actions.delete')}: ${title}`}
        >
          {t('common:actions.delete')}
        </Button>
      </div>
    </li>
  );
}

export default function AddressesPage() {
  const { t } = useTranslation();
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<AddressDTO | null>(null);
  useDocumentMeta({ title: t('shop:addresses.title'), noindex: true });
  const list = addresses.data ?? [];

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(t('shop:addresses.deleted'));
      setDeleting(null);
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  const addButton =
    list.length < LIMITS.addressesMax ? (
      <Button onClick={() => setEditing({ mode: 'create' })} leftIcon={<PlusIcon aria-hidden="true" />}>
        {t('shop:addresses.add')}
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <AccountHeading title={t('shop:addresses.title')} actions={list.length ? addButton : null} />
      {addresses.isPending ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />
      ) : !list.length ? (
        <EmptyState bordered icon={<MapPinIcon />} title={t('shop:addresses.empty')} description={t('shop:addresses.emptyHint')} action={addButton} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((a) => (
            <AddressCard key={a.id} address={a} onEdit={() => setEditing({ mode: 'edit', address: a })} onDelete={() => setDeleting(a)} />
          ))}
        </ul>
      )}

      <AddressDialog editing={editing} onClose={() => setEditing(null)} count={list.length} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !remove.isPending && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shop:addresses.deleteConfirm')}</AlertDialogTitle>
            {deleting ? <AlertDialogDescription>{deleting.label || formatAddressShort(deleting)}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t('common:actions.cancel')}</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void confirmDelete()} loading={remove.isPending}>
              {t('common:actions.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatAddressShort(a: AddressDTO): string {
  return [a.street, a.house].filter(Boolean).join(', ');
}
