import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Closed-by-default disclosure — the replacement for the old
 * `<details class="advanced-export">` blocks.
 */
export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Collapsible className="flex flex-col gap-3 border-t pt-3">
      <CollapsibleTrigger className="group/disclosure flex w-full items-center gap-1.5 font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase transition-colors outline-none select-none hover:text-foreground focus-visible:text-foreground data-panel-open:text-foreground">
        <ChevronRightIcon className="size-3 shrink-0 transition-transform group-data-panel-open/disclosure:rotate-90" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
