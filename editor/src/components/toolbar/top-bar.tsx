import { Redo2Icon, Undo2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeMenu } from '@/components/theme-menu';
import type { Mode } from '@/lib/model';

import { Segmented } from './segmented';

type ViewMode = '2d' | '3d';

export function TopBar({
  view,
  onViewChange,
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4 md:col-span-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* The shipped mark is solid Basalt; inverting keeps it legible on the
            dark ground without touching the (asset-locked) file. */}
        <img
          src="/namche-mark.svg"
          alt=""
          aria-hidden="true"
          className="size-6 shrink-0 dark:invert"
        />
        <div className="hidden min-w-0 flex-col leading-none sm:flex">
          <span className="font-mono text-[0.5625rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            NAMCHE
          </span>
          <span className="truncate font-display text-base font-medium">Metaball Studio</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={onUndo}>
                <Undo2Icon />
                <span className="sr-only">Undo</span>
              </Button>
            }
          />
          <TooltipContent>
            Undo
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>Z</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={onRedo}>
                <Redo2Icon />
                <span className="sr-only">Redo</span>
              </Button>
            }
          />
          <TooltipContent>
            Redo
            <KbdGroup>
              <Kbd>⇧</Kbd>
              <Kbd>⌘</Kbd>
              <Kbd>Z</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Segmented
          label="View dimension"
          value={view}
          onValueChange={onViewChange}
          className="w-auto"
          options={[
            { value: '2d', label: '2D' },
            { value: '3d', label: '3D' },
          ]}
        />

        {view === '2d' && (
          <Segmented
            label="2D canvas mode"
            value={mode}
            onValueChange={onModeChange}
            className="w-auto"
            options={[
              { value: 'metaball', label: 'Form', hint: 'Style and export the mark.' },
              { value: 'graph', label: 'Graph', hint: 'Inspect and edit its network.' },
            ]}
          />
        )}

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ThemeMenu />
      </div>
    </header>
  );
}
