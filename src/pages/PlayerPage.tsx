import { lazy, Suspense } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import PageLoader from './PageLoader';

const PlayerDiscovery = lazy(() => import('./PlayerDiscovery'));
const UnifiedPlayerExperience = lazy(() => import('../components/UnifiedPlayerExperience'));

export default function PlayerPage() {
  const local = usePlayer();
  const universal = useUniversalPlayer();
  const hasSelection = Boolean(universal.activeAudio || universal.activeVideo || local.hasInitiatedPlayback);

  return <Suspense fallback={<PageLoader />}>
    {local.isExpanded && hasSelection
      ? <div className="pt-20 md:pt-24"><UnifiedPlayerExperience onReturnToDiscovery={() => local.setIsExpanded(false)} /></div>
      : <PlayerDiscovery />}
  </Suspense>;
}
