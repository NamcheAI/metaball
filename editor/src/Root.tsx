import { Suspense, lazy } from 'react'
import Intro from './components/intro/Intro.tsx'

/* Two entry points, no router library: `/` tells the brand story, everything
   else is the Studio. The server's SPA fallback serves this same shell for
   /studio, and the links between the two are plain anchors — a full load is
   the honest boundary between a static page and a stateful editor.
   The Studio is loaded lazily so the intro never downloads the editor. */
const Studio = lazy(() => import('./App.tsx'))

function isIntroPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/index.html'
}

export default function Root() {
  if (isIntroPath(window.location.pathname)) return <Intro />
  return (
    <Suspense fallback={null}>
      <Studio />
    </Suspense>
  )
}
