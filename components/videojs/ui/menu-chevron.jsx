import { ChevronIcon as ChevronIconPrimitive } from '@videojs/react/icons';
import { cn } from '@/lib/resolve-class-name';
export function MenuChevron({ back = false, className } = {}) {
    return (<ChevronIconPrimitive className={cn(back
            ? 'shrink-0 drop-shadow-media-icon text-media-muted-foreground size-media-icon-sm rotate-180 rtl:rotate-0 rtl:scale-[1_1] group-media-highlighted/menu-back-item:text-inherit'
            : 'shrink-0 drop-shadow-media-icon text-media-muted-foreground size-media-icon-sm rtl:scale-[-1_1] group-media-highlighted/menu-trigger-item:text-inherit', className)}/>);
}
