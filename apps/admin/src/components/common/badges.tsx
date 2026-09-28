import type {
  ContactMessageStatus,
  ExpenseStatus,
  InstallmentStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  QuestionStatus,
  RefundStatus,
  ReviewStatus,
  StockStatus,
  UserStatus,
} from '@vero/types';
import { Badge, cn, type BadgeVariant } from '@vero/ui';
import { useTranslation } from 'react-i18next';

const ORDER: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'muted',
};

const PAYMENT: Record<PaymentStatus, BadgeVariant> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'muted',
  REFUND_PENDING: 'warning',
  REFUNDED: 'secondary',
};

const STOCK: Record<StockStatus, BadgeVariant> = { in_stock: 'success', low_stock: 'warning', out_of_stock: 'danger' };
const PRODUCT: Record<ProductStatus, BadgeVariant> = { published: 'success', draft: 'secondary', archived: 'muted' };
const REVIEW: Record<ReviewStatus, BadgeVariant> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
const QUESTION: Record<QuestionStatus, BadgeVariant> = { PENDING: 'warning', PUBLISHED: 'success', REJECTED: 'danger' };
const USER: Record<UserStatus, BadgeVariant> = { active: 'success', blocked: 'danger' };
const EXPENSE: Record<ExpenseStatus, BadgeVariant> = { PAID: 'success', PENDING: 'warning', CANCELLED: 'muted' };
const MESSAGE: Record<ContactMessageStatus, BadgeVariant> = { NEW: 'brand', IN_PROGRESS: 'info', DONE: 'success' };
const REFUND: Record<RefundStatus, BadgeVariant> = { NONE: 'muted', PENDING: 'warning', REFUNDED: 'success', REJECTED: 'danger' };
const INSTALLMENT: Record<InstallmentStatus, BadgeVariant> = { NONE: 'muted', UNDER_REVIEW: 'warning', APPROVED: 'success', REJECTED: 'danger' };

type Kind =
  | { kind: 'order'; value: OrderStatus }
  | { kind: 'payment'; value: PaymentStatus }
  | { kind: 'stock'; value: StockStatus }
  | { kind: 'product'; value: ProductStatus }
  | { kind: 'review'; value: ReviewStatus }
  | { kind: 'question'; value: QuestionStatus }
  | { kind: 'user'; value: UserStatus }
  | { kind: 'expense'; value: ExpenseStatus }
  | { kind: 'message'; value: ContactMessageStatus }
  | { kind: 'refund'; value: RefundStatus }
  | { kind: 'installment'; value: InstallmentStatus };

/** Coloured status badge with a dot; the text always names the state (never colour alone). */
export function StatusBadge({ className, size = 'default', ...props }: Kind & { className?: string; size?: 'sm' | 'default' | 'lg' }) {
  const { t } = useTranslation();
  let variant: BadgeVariant = 'secondary';
  let label: string = props.value;
  switch (props.kind) {
    case 'order':
      variant = ORDER[props.value] ?? 'secondary';
      label = t(`common:orderStatus.${props.value}`);
      break;
    case 'payment':
      variant = PAYMENT[props.value] ?? 'secondary';
      label = t(`common:paymentStatus.${props.value}`);
      break;
    case 'stock':
      variant = STOCK[props.value] ?? 'secondary';
      label = t(`common:stock.${props.value}`);
      break;
    case 'product':
      variant = PRODUCT[props.value] ?? 'secondary';
      label = t(`status.product.${props.value}`);
      break;
    case 'review':
      variant = REVIEW[props.value] ?? 'secondary';
      label = t(`status.review.${props.value}`);
      break;
    case 'question':
      variant = QUESTION[props.value] ?? 'secondary';
      label = t(`status.question.${props.value}`);
      break;
    case 'user':
      variant = USER[props.value] ?? 'secondary';
      label = t(`status.user.${props.value}`);
      break;
    case 'expense':
      variant = EXPENSE[props.value] ?? 'secondary';
      label = t(`status.expense.${props.value}`);
      break;
    case 'message':
      variant = MESSAGE[props.value] ?? 'secondary';
      label = t(`status.message.${props.value}`);
      break;
    case 'refund':
      variant = REFUND[props.value] ?? 'secondary';
      label = t(`status.refund.${props.value}`);
      break;
    case 'installment':
      variant = INSTALLMENT[props.value] ?? 'secondary';
      label = t(`common:installmentStatus.${props.value}`);
      break;
  }
  return (
    <Badge variant={variant} size={size} dot className={cn('font-semibold', className)}>
      {label}
    </Badge>
  );
}

/** Active / inactive pill for simple boolean states. */
export function ActiveBadge({ active, className }: { active: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={active ? 'success' : 'muted'} dot className={className}>
      {active ? t('common.active') : t('common.inactive')}
    </Badge>
  );
}
