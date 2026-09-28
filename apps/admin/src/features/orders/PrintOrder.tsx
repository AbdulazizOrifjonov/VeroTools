import { useSettings } from '@vero/api-client';
import type { AdminOrder } from '@vero/types';
import { Logo } from '@vero/ui';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../lib/format';

export type PrintKind = 'invoice' | 'packing';

/**
 * Printable invoice / packing slip. Rendered into <body> next to the app; the print stylesheet hides the
 * app and prints only this document (plain black on white, A4).
 */
export function PrintOrder({ order, kind }: { order: AdminOrder; kind: PrintKind | null }) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  if (!kind) return null;
  const store = settings.data?.store;
  const addr = order.delivery.address;
  const addressLine = addr
    ? [addr.regionName, addr.city, addr.district, addr.street, addr.house ? t('orders.delivery.house', { n: addr.house }) : null, addr.apartment ? t('orders.delivery.apartment', { n: addr.apartment }) : null].filter(Boolean).join(', ')
    : order.delivery.pickupPoint
      ? `${order.delivery.pickupPoint.name} — ${order.delivery.pickupPoint.address}`
      : '—';
  const invoice = kind === 'invoice';

  return createPortal(
    <div className="print-root" style={{ fontFamily: 'Manrope Variable, Manrope, system-ui, sans-serif', color: '#111', fontSize: 12, lineHeight: 1.45 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Logo size={44} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{store?.name ?? 'VERO TOOLS'}</div>
            {store?.legalName ? <div>{store.legalName}</div> : null}
            {store?.address ? <div>{store.address}</div> : null}
            <div>{[store?.phone ? f.phone(store.phone) : null, store?.email].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{invoice ? t('orders.print.invoiceTitle', { number: order.number }) : t('orders.print.packingTitle', { number: order.number })}</div>
          <div>{t('orders.print.date', { date: f.datetime(order.createdAt) })}</div>
          <div>{t(`common:orderStatus.${order.status}`)}</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.6, marginBottom: 4 }}>{t('orders.print.buyer')}</div>
          <div style={{ fontWeight: 600 }}>{`${order.customerInfo.firstName} ${order.customerInfo.lastName}`.trim()}</div>
          <div>{f.phone(order.customerInfo.phone)}</div>
          {order.customerInfo.email ? <div>{order.customerInfo.email}</div> : null}
        </div>
        <div>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.6, marginBottom: 4 }}>{t('orders.print.shipTo')}</div>
          <div style={{ fontWeight: 600 }}>{t(`common:deliveryMethod.${order.deliveryMethod}`)}</div>
          <div>{addressLine}</div>
          {addr?.comment ? <div>{addr.comment}</div> : null}
          {order.delivery.carrier || order.delivery.trackingNumber ? <div>{[order.delivery.carrier, order.delivery.trackingNumber].filter(Boolean).join(' · ')}</div> : null}
        </div>
      </section>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            {['#', 'SKU', t('orders.items.product'), ...(invoice ? [t('orders.items.price')] : []), t('orders.items.qty'), ...(invoice ? [t('orders.items.total')] : [t('orders.print.checked')])].map((h, i) => (
              <th key={i} style={{ textAlign: i >= 3 ? 'right' : 'left', borderBottom: '1px solid #111', padding: '6px 4px', fontSize: 11 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={item.id}>
              <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>{i + 1}</td>
              <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{item.sku}</td>
              <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
                {f.loc(item.name)}
                {item.variantName ? <div style={{ color: '#555' }}>{f.loc(item.variantName)}</div> : null}
              </td>
              {invoice ? <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap' }}>{f.money(item.price)}</td> : null}
              <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>{item.quantity}</td>
              {invoice ? (
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap' }}>{f.money(item.total)}</td>
              ) : (
                <td style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>☐</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {invoice ? (
        <table style={{ marginLeft: 'auto', minWidth: 260, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              { label: t('orders.totals.subtotalBefore'), value: f.money(order.oldSubtotal || order.subtotal) },
              ...(order.productDiscount ? [{ label: t('orders.totals.productDiscount'), value: `−${f.money(order.productDiscount)}` }] : []),
              ...(order.couponDiscount ? [{ label: t('orders.totals.coupon', { code: order.coupon?.code ?? '' }), value: `−${f.money(order.couponDiscount)}` }] : []),
              { label: t('orders.totals.delivery'), value: order.deliveryFee ? f.money(order.deliveryFee) : t('orders.totals.free') },
            ].map((row) => (
              <tr key={row.label}>
                <td style={{ padding: '3px 8px 3px 0' }}>{row.label}</td>
                <td style={{ padding: '3px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.value}</td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '6px 8px 0 0', borderTop: '1px solid #111', fontWeight: 800, fontSize: 14 }}>{t('orders.totals.total')}</td>
              <td style={{ padding: '6px 0 0', borderTop: '1px solid #111', textAlign: 'right', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>{f.money(order.total)}</td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <footer style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
        <div>{t('orders.print.paymentLine', { method: t(`common:paymentMethod.${order.paymentMethod}`), status: t(`common:paymentStatus.${order.paymentStatus}`) })}</div>
        <div style={{ textAlign: 'right' }}>
          <div>{invoice ? t('orders.print.signature') : t('orders.print.packedBy')}</div>
          {invoice ? <div style={{ marginTop: 12, fontWeight: 600 }}>{t('orders.print.thanks')}</div> : null}
        </div>
      </footer>
    </div>,
    document.body,
  );
}
