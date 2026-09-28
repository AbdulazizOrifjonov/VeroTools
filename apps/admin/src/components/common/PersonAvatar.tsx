import { Avatar, AvatarFallback, AvatarImage, cn } from '@vero/ui';
import { getInitials } from '@vero/utils';
import { assetUrl } from '../../lib/images';

/** Round avatar: photo when there is one, initials otherwise. */
export function PersonAvatar({ name, src, size = 'sm', className }: { name: string; src?: string | null; size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'; className?: string }) {
  return (
    <Avatar size={size} className={cn('shrink-0', className)}>
      {src ? <AvatarImage src={assetUrl(src)} alt="" /> : null}
      <AvatarFallback className={size === 'xs' || size === 'sm' ? 'text-[11px]' : undefined}>{getInitials(name) || '?'}</AvatarFallback>
    </Avatar>
  );
}
