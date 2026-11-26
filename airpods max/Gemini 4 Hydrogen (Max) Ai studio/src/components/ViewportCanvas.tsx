import React, { useEffect, useRef, useState } from 'react';
import type { AirPodsColorway } from '../data/airpodsSpec';
import {
  createStudioScene,
  type StudioFramePayload,
  type StudioSceneController,
} from '../engine/studioScene';

interface ViewportCanvasProps {
  initialColorway: AirPodsColorway;
  colorway: AirPodsColorway;
  scrollProgressRef: React.MutableRefObject<number>;
  freeOrbit: boolean;
  onFrame: (payload: StudioFramePayload) => void;
  sceneControllerRef: React.MutableRefObject<StudioSceneController | null>;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  initialColorway,
  colorway,
  freeOrbit,
  onFrame,
  sceneControllerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [contextLost, setContextLost] = useState(false);

  // Mount WebGL scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = createStudioScene(
      container,
      initialColorway,
      (payload) => onFrameRef.current(payload),
      (lost) => setContextLost(lost),
    );
    sceneControllerRef.current = controller;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    controller.setReducedMotion(mq.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => {
      controller.setReducedMotion(e.matches);
    };
    mq.addEventListener('change', handleMotionChange);

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      controller.setPointerTilt(nx, ny);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      mq.removeEventListener('change', handleMotionChange);
      controller.dispose();
      sceneControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update colorway smoothly via imperative ref
  useEffect(() => {
    sceneControllerRef.current?.setColorway(colorway);
  }, [colorway, sceneControllerRef]);

  // Toggle interactive OrbitControls
  useEffect(() => {
    sceneControllerRef.current?.setFreeOrbit(freeOrbit);
  }, [freeOrbit, sceneControllerRef]);

  return (
    <>
      <div
        ref={mountRef}
        aria-label="Interactive 3D AirPods Max viewport"
        className={`fixed inset-0 z-0 ${freeOrbit ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
      />
      {contextLost && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-[#f5f5f7] px-6 text-center">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-11-26_at_4.22.11_PM__2__b319ba96.jpeg"
            alt="Apple AirPods Max studio view"
            referrerPolicy="no-referrer"
            className="max-h-[55vh] w-auto object-contain rounded-2xl"
          />
          <p className="mt-4 text-[14px] text-[#1d1d1f]/70">
            3D WebGL context paused. Restoring hardware-accelerated viewport.
          </p>
        </div>
      )}
    </>
  );
};
