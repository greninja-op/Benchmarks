import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeChoreographyState,
  getActiveStageIndex,
  smoothstep,
} from './choreography';
import { AIRPODS_COLORWAYS, SCROLL_STAGES } from '../data/airpodsSpec';

test('getActiveStageIndex maps every boundary across all 7 stages cleanly', () => {
  assert.equal(getActiveStageIndex(0.0), 0);
  assert.equal(getActiveStageIndex(0.119), 0);
  assert.equal(getActiveStageIndex(0.12), 1);
  assert.equal(getActiveStageIndex(0.26), 2);
  assert.equal(getActiveStageIndex(0.44), 3);
  assert.equal(getActiveStageIndex(0.58), 4);
  assert.equal(getActiveStageIndex(0.72), 5);
  assert.equal(getActiveStageIndex(0.88), 6);
  assert.equal(getActiveStageIndex(1.0), 6);
  assert.equal(SCROLL_STAGES.length, 7);
});

test('Stage 3 activates Digital Crown spin and control callouts', () => {
  const hero = computeChoreographyState(0.05);
  assert.equal(hero.controlsCalloutOpacity, 0);

  const macro = computeChoreographyState(0.36);
  assert.equal(macro.stageIndex, 2);
  assert.ok(macro.controlsCalloutOpacity > 0.9, 'controls callout should be visible at 36%');
  assert.ok(macro.crownSpin > 0.5, 'crown should spin during macro zoom');
});

test('Stage 5 detaches cushions and snaps them cleanly back before Stage 6', () => {
  const before = computeChoreographyState(0.55);
  assert.equal(before.cushionDetach, 0);

  const midDetach = computeChoreographyState(0.65);
  assert.equal(midDetach.stageIndex, 4);
  assert.ok(midDetach.cushionDetach > 0.95, 'cushions should be detached at peak of Stage 5');

  const afterSnap = computeChoreographyState(0.72);
  assert.equal(afterSnap.cushionDetach, 0);
});

test('Stage 6 expands exploded view horizontally and reassembles cleanly', () => {
  const before = computeChoreographyState(0.70);
  assert.equal(before.explodeFactor, 0);

  const midExplode = computeChoreographyState(0.80);
  assert.equal(midExplode.stageIndex, 5);
  assert.ok(midExplode.explodeFactor > 0.95, 'exploded view should be expanded at 80%');
  assert.ok(midExplode.explodedCalloutOpacity > 0.9, 'exploded callouts should be visible');

  const reassembled = computeChoreographyState(0.88);
  assert.equal(reassembled.explodeFactor, 0);
});

test('Stage 7 swivels ear cups flat, lifts Smart Case, seats headset, and closes magnetic flap', () => {
  const before = computeChoreographyState(0.85);
  assert.equal(before.cupSwivelFlat, 0);
  assert.equal(before.smartCaseOpacity, 0);

  const entry = computeChoreographyState(0.915);
  assert.ok(entry.cupSwivelFlat > 0.95, 'cups should swivel flat early in Stage 7');
  assert.ok(entry.smartCaseLift > 0.3, 'Smart Case should rise into frame');
  assert.equal(entry.smartCaseFlapClose, 0);

  const finale = computeChoreographyState(1.0);
  assert.equal(finale.cupSwivelFlat, 1);
  assert.equal(finale.smartCaseLift, 1);
  assert.equal(finale.headsetDropInCase, 1);
  assert.equal(finale.smartCaseFlapClose, 1);
});

test('Colorway index advances cleanly across 5 finishes during Stage 2', () => {
  const indices = [0.125, 0.155, 0.185, 0.215, 0.248].map(
    (p) => computeChoreographyState(p).autoColorwayIndex,
  );
  assert.deepEqual(indices, [0, 1, 2, 3, 4]);
  assert.equal(AIRPODS_COLORWAYS.length, 5);
});

test('smoothstep clamps out-of-range inputs', () => {
  assert.equal(smoothstep(0.2, 0.8, 0.0), 0);
  assert.equal(smoothstep(0.2, 0.8, 1.0), 1);
  assert.equal(smoothstep(0.5, 0.5, 0.5), 1);
});
