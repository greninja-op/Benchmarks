import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { LeaderLinesOverlay, type LeaderLinesHandle } from './components/LeaderLinesOverlay';
import { SpecsModal } from './components/SpecsModal';
import { StageNarrative } from './components/StageNarrative';
import { TopNav } from './components/TopNav';
import { ViewportCanvas } from './components/ViewportCanvas';
import {
  AIRPODS_COLORWAYS,
  SCROLL_STAGES,
  type ColorwayId,
} from './data/airpodsSpec';
import { getActiveStageIndex } from './engine/choreography';
import type { StudioFramePayload, StudioSceneController } from './engine/studioScene';

export default function App() {
  const [selectedColorwayId, setSelectedColorwayId] = useState<ColorwayId>('silver');
  const [userPinnedColorway, setUserPinnedColorway] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [freeOrbit, setFreeOrbit] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);

  const scrollProgressRef = useRef(0);
  const lastStageRef = useRef(0);
  const lastAutoColorIndexRef = useRef(0);
  const sceneControllerRef = useRef<StudioSceneController | null>(null);
  const leaderOverlayRef = useRef<LeaderLinesHandle | null>(null);

  const selectedColorway = useMemo(
    () => AIRPODS_COLORWAYS.find((c) => c.id === selectedColorwayId) ?? AIRPODS_COLORWAYS[0],
    [selectedColorwayId],
  );

  const activeStage = SCROLL_STAGES[activeStageIndex] ?? SCROLL_STAGES[0];

  // Sync native document scroll -> WebGL choreography target
  useEffect(() => {
    const computeProgress = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      scrollProgressRef.current = progress;
      sceneControllerRef.current?.setTargetScroll(progress);

      const stageIdx = getActiveStageIndex(progress);
      if (stageIdx !== lastStageRef.current) {
        lastStageRef.current = stageIdx;
        setActiveStageIndex(stageIdx);
      }
    };

    computeProgress();
    window.addEventListener('scroll', computeProgress, { passive: true });
    window.addEventListener('resize', computeProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', computeProgress);
      window.removeEventListener('resize', computeProgress);
    };
  }, []);

  // Keyboard shortcut: 'H' toggles Cinema / Zen mode (hide/show HUD)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        specsOpen
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setHudHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [specsOpen]);

  // Frame callback from StudioScene (runs on active animation frames; zero 60Hz setState)
  const handleSceneFrame = useCallback(
    (payload: StudioFramePayload) => {
      leaderOverlayRef.current?.update(payload);

      // Stage 2 auto-morphs across the 5 finishes if user hasn't explicitly pinned a colorway
      if (!userPinnedColorway && payload.state.stageIndex === 1) {
        const autoIdx = payload.state.autoColorwayIndex;
        if (autoIdx !== lastAutoColorIndexRef.current) {
          lastAutoColorIndexRef.current = autoIdx;
          const cw = AIRPODS_COLORWAYS[autoIdx];
          if (cw) {
            setSelectedColorwayId(cw.id);
          }
        }
      }
    },
    [userPinnedColorway],
  );

  const handleSelectColorway = useCallback((id: ColorwayId) => {
    setUserPinnedColorway(true);
    setSelectedColorwayId(id);
  }, []);

  const handleJumpToStage = useCallback((targetProgress: number) => {
    setFreeOrbit(false);
    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );
    window.scrollTo({
      top: targetProgress * maxScroll,
      behavior: 'smooth',
    });
  }, []);

  const handleNextStage = useCallback(() => {
    const next = SCROLL_STAGES[Math.min(activeStageIndex + 1, SCROLL_STAGES.length - 1)];
    handleJumpToStage(next.targetScroll);
  }, [activeStageIndex, handleJumpToStage]);

  return (
    <div className="relative bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Fixed Top Navigation */}
      <TopNav
        activeStageIndex={activeStageIndex}
        onJumpToStage={handleJumpToStage}
        onOpenSpecs={() => setSpecsOpen(true)}
      />

      {/* Persistent Full-Viewport WebGL Showcase */}
      <ViewportCanvas
        initialColorway={AIRPODS_COLORWAYS[0]}
        colorway={selectedColorway}
        scrollProgressRef={scrollProgressRef}
        freeOrbit={freeOrbit}
        onFrame={handleSceneFrame}
        sceneControllerRef={sceneControllerRef}
      />

      {/* 2D-Projected Technical SVG Leader Lines */}
      <LeaderLinesOverlay ref={leaderOverlayRef} freeOrbit={freeOrbit} />

      {/* Editorial Stage Narrative */}
      <StageNarrative
        stage={activeStage}
        colorway={selectedColorway}
        hudHidden={hudHidden}
        freeOrbit={freeOrbit}
        onExploreSpecs={() => setSpecsOpen(true)}
        onNextStage={handleNextStage}
      />

      {/* Unified Collapsible Bottom Dock */}
      <ControlDock
        selectedColorway={selectedColorway}
        activeStageIndex={activeStageIndex}
        freeOrbit={freeOrbit}
        hudHidden={hudHidden}
        onSelectColorway={handleSelectColorway}
        onJumpToStage={handleJumpToStage}
        onToggleFreeOrbit={() => setFreeOrbit((prev) => !prev)}
        onToggleHud={() => setHudHidden((prev) => !prev)}
      />

      {/* Technical Specifications Dialog */}
      <SpecsModal
        open={specsOpen}
        colorway={selectedColorway}
        onClose={() => setSpecsOpen(false)}
      />

      {/* Scroll Choreography Track (7 stages spanning 760vh) */}
      <main
        data-stage-index={activeStageIndex}
        data-colorway={selectedColorway.id}
        className="relative z-0 pointer-events-none"
        aria-label="AirPods Max scroll showcase"
      >
        {SCROLL_STAGES.map((stage) => (
          <div
            key={stage.id}
            id={`stage-${stage.id}`}
            style={{
              height: `${Math.round((stage.end - stage.start) * 760)}vh`,
            }}
            aria-hidden="true"
          />
        ))}
      </main>
    </div>
  );
}
