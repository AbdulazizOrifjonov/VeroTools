import { Price, type PriceProps } from '@vero/ui';
import { useTranslation } from 'react-i18next';

/** <Price /> with translated currency and screen-reader labels. */
export function Money(props: Omit<PriceProps, 'currencyLabel' | 'oldAmountLabel' | 'amountLabel'>) {
  const { t } = useTranslation();
  return (
    <Price
      currencyLabel={t('common:currency')}
      oldAmountLabel={t('common:product.oldPrice')}
      amountLabel={t('common:product.price')}
      {...props}
    />
  );
}
