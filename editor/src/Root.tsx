import { Suspense, lazy } from 'react'
import Intro from './components/intro/Intro.tsx'
import StudioChooser from './components/StudioChooser.tsx'

/* Entry points, no router library: `/` tells the brand story, `/studio` is
   the fork between the two Studio paths, and each path is its own page —
   2D mark work and 3D object work are different deliverables with different
   toolsets, so the choice is a navigation, not a toolbar toggle. The
   server's SPA fallback serves this same shell for every path, links are
   plain anchors, and the Studio is loaded lazily so the intro and the
   chooser never download the editor. The legacy `/studio` deep link lands
   on the chooser. */
const Studio = lazy(() => import('./App.tsx'))

export default function Root() {
  const pathname = window.location.pathname
  if (pathname === '/' || pathname === '/index.html') return <Intro />
  if (pathname.startsWith('/studio/mark') || pathname.startsWith('/studio/object')) {
    return (
      <Suspense fallback={null}>
        <Studio initialView={pathname.startsWith('/studio/object') ? '3d' : '2d'} />
      </Suspense>
    )
  }
  return <StudioChooser />
}
