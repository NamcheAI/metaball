import { cn } from '@/lib/utils';
import { TEXTURE_OPTIONS, textureThumbUrl } from '../../lib/texturePresets';
import { GroupLabel } from './fields';

/**
 * Thumbnail grid over the NAMCHE curated texture imagery. Thumbnails stream
 * from cdn.namche.ai (≤480px WebP, immutable); the selection is a slug from
 * @namche/imagery, so a texture retired upstream disappears from the grid on
 * the next dependency bump instead of breaking silently.
 */
export function TexturePicker({
  value,
  onValueChange,
}: {
  value: string | null;
  onValueChange: (slug: string | null) => void;
}) {
  return (
    <div>
      <GroupLabel>Surface texture</GroupLabel>
      <div role="listbox" aria-label="Surface texture" className="grid grid-cols-5 gap-1.5">
        <button
          type="button"
          role="option"
          aria-selected={value === null}
          onClick={() => onValueChange(null)}
          className={cn(
            'aspect-square rounded-md border text-[10px] leading-tight text-muted-foreground',
            value === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-transparent hover:border-foreground/40',
          )}
        >
          Off
        </button>
        {TEXTURE_OPTIONS.map((image) => (
          <button
            key={image.slug}
            type="button"
            role="option"
            aria-selected={value === image.slug}
            title={`${image.theme.replace('_', ' · ')} — ${image.original}`}
            onClick={() => onValueChange(value === image.slug ? null : image.slug)}
            className={cn(
              'aspect-square overflow-hidden rounded-md border transition-colors',
              value === image.slug
                ? 'border-primary ring-2 ring-primary'
                : 'border-border hover:border-foreground/40',
            )}
          >
            <img
              src={textureThumbUrl(image.slug)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
