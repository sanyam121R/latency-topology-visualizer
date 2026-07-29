import { SceneRoot } from '@/components/scene/SceneRoot';

/**
 * Thin server component. R3F is client-only, so the page's only job is to mount
 * the client root. Keeping the boundary here (rather than inside the scene) means
 * future server-rendered panels can live alongside it.
 */
export default function Home() {
  return <SceneRoot />;
}