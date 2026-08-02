import type { ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="toolbar-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
