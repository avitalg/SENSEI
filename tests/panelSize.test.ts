// Pure-unit coverage for clampPanelSize — the drag-resize clamp for the "שאל את
// סנסיי" panel. Kept DOM-free so every branch (min floor, viewport cap, rounding)
// is exercised cheaply, independent of the component that consumes it.
import { describe, expect, it } from 'vitest';
import { clampPanelSize } from '../src/components/layout/AiAssistant';

// A roomy viewport so the min/normal cases aren't accidentally capped by it.
const VW = 1440;
const VH = 900;

describe('clampPanelSize', () => {
  it('passes a size through unchanged when it is within all bounds', () => {
    expect(clampPanelSize(500, 480, VW, VH)).toEqual({ w: 500, h: 480 });
  });

  it('floors width and height at the minimum panel size', () => {
    expect(clampPanelSize(100, 50, VW, VH)).toEqual({ w: 340, h: 360 });
  });

  it('caps width and height to the viewport minus the 48px gap', () => {
    expect(clampPanelSize(99999, 99999, 1000, 800)).toEqual({ w: 952, h: 752 });
  });

  it('clamps only the axis that is out of range, leaving the other intact', () => {
    // Width too small, height fine.
    expect(clampPanelSize(200, 480, VW, VH)).toEqual({ w: 340, h: 480 });
    // Height over the viewport cap, width fine.
    expect(clampPanelSize(500, 99999, 1000, 800)).toEqual({ w: 500, h: 752 });
  });

  it('rounds fractional pointer deltas to whole pixels', () => {
    expect(clampPanelSize(500.6, 480.4, VW, VH)).toEqual({ w: 501, h: 480 });
  });

  it('never returns below the minimum even on a tiny viewport (min wins over cap)', () => {
    // vw - 48 = 252 < 340, so the min floor must take precedence.
    expect(clampPanelSize(500, 500, 300, 300)).toEqual({ w: 340, h: 360 });
  });
});
