import type { Language } from '@vero/config';
import type { BannerDTO, FaqDTO, PageDTO, PromotionDTO } from '@vero/types';
import type { IBanner, IPromotion } from '../../models/marketing.model';
import type { IFaq, IPage } from '../../models/content.model';
import { iso, loc, toImageRef } from '../../lib/localize';

export function toBannerDTO(b: IBanner, lang: Language): BannerDTO {
  const title = loc(b.title, lang);
  return {
    id: String(b._id),
    placement: b.placement,
    title,
    subtitle: loc(b.subtitle, lang) || undefined,
    buttonText: loc(b.buttonText, lang) || undefined,
    buttonUrl: b.buttonUrl || undefined,
    imageDesktop: toImageRef(b.imageDesktop, lang, title),
    imageMobile: toImageRef(b.imageMobile ?? b.imageDesktop, lang, title),
    textTheme: b.textTheme,
  };
}

export function toPromotionDTO(p: IPromotion, lang: Language, now = new Date()): PromotionDTO {
  return {
    id: String(p._id),
    slug: p.slug,
    name: loc(p.name, lang),
    description: loc(p.description, lang) || undefined,
    type: p.type,
    discountType: p.discountType,
    discountValue: p.discountValue,
    startsAt: iso(p.startsAt)!,
    endsAt: iso(p.endsAt)!,
    image: toImageRef(p.image, lang, loc(p.name, lang)),
    productCount: p.productCount ?? 0,
    isActive: p.isActive && p.startsAt <= now && p.endsAt > now,
  };
}

export const toPageDTO = (p: IPage, lang: Language): PageDTO => ({
  slug: p.slug,
  title: loc(p.title, lang),
  content: loc(p.content, lang),
  seoTitle: loc(p.seoTitle, lang) || undefined,
  seoDescription: loc(p.seoDescription, lang) || undefined,
  updatedAt: iso(p.updatedAt)!,
});

export const toFaqDTO = (f: IFaq, lang: Language): FaqDTO => ({
  id: String(f._id),
  category: f.category,
  question: loc(f.question, lang),
  answer: loc(f.answer, lang),
});
