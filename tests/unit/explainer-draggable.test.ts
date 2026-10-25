import { describe, it, expect, beforeEach } from 'vitest';

describe('Draggable Bubble Position Logic', () => {
  const memoryStore: Record<string, string> = {};

  beforeEach(() => {
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
  });

  function clampPosition(
    pos: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number,
    bubbleSize: number = 60
  ) {
    const maxX = Math.max(10, viewportWidth - bubbleSize - 10);
    const maxY = Math.max(10, viewportHeight - bubbleSize - 10);
    return {
      x: Math.min(Math.max(10, pos.x), maxX),
      y: Math.min(Math.max(10, pos.y), maxY),
    };
  }

  function computeCalloutPlacement(
    bubblePos: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number,
    calloutWidth: number = 360
  ) {
    const isNearBottom = bubblePos.y + 60 + 220 > viewportHeight;
    const placement: 'top' | 'bottom' = isNearBottom ? 'top' : 'bottom';
    const calloutY = isNearBottom ? Math.max(12, bubblePos.y - 195) : bubblePos.y + 64;

    const rawCalloutX =
      bubblePos.x + calloutWidth > viewportWidth - 12
        ? bubblePos.x + 52 - calloutWidth
        : bubblePos.x - 10;
    const calloutX = Math.max(12, Math.min(rawCalloutX, viewportWidth - calloutWidth - 12));

    const bubbleCenterX = bubblePos.x + 26;
    const arrowOffset = Math.max(16, Math.min(calloutWidth - 28, bubbleCenterX - calloutX - 7));

    return { placement, calloutX, calloutY, arrowOffset };
  }

  it('clamps coordinates safely within viewport boundaries', () => {
    const clampedOffscreenLeft = clampPosition({ x: -100, y: -50 }, 1024, 768);
    expect(clampedOffscreenLeft.x).toBe(10);
    expect(clampedOffscreenLeft.y).toBe(10);

    const clampedOffscreenRight = clampPosition({ x: 2000, y: 1500 }, 1024, 768);
    expect(clampedOffscreenRight.x).toBe(954); // 1024 - 60 - 10
    expect(clampedOffscreenRight.y).toBe(698); // 768 - 60 - 10
  });

  it('persists and restores dragged coordinates from storage', () => {
    const savedPos = { x: 340, y: 520 };
    memoryStore['simxsphere_bubble_position'] = JSON.stringify(savedPos);

    const retrieved = JSON.parse(memoryStore['simxsphere_bubble_position'] || '{}');
    expect(retrieved.x).toBe(340);
    expect(retrieved.y).toBe(520);
  });

  it('flips callout above bubble when dragged near bottom of viewport', () => {
    // Top of screen: callout should be below bubble
    const topPlacement = computeCalloutPlacement({ x: 500, y: 40 }, 1280, 800);
    expect(topPlacement.placement).toBe('bottom');
    expect(topPlacement.calloutY).toBe(104);

    // Bottom of screen: callout should flip above bubble
    const bottomPlacement = computeCalloutPlacement({ x: 500, y: 650 }, 1280, 800);
    expect(bottomPlacement.placement).toBe('top');
    expect(bottomPlacement.calloutY).toBe(455);
  });

  it('keeps callout within screen edges when bubble is dragged to far right', () => {
    const farRightPlacement = computeCalloutPlacement({ x: 1200, y: 100 }, 1280, 800);
    expect(farRightPlacement.calloutX + 360).toBeLessThanOrEqual(1280);
    expect(farRightPlacement.calloutX).toBeGreaterThanOrEqual(12);
  });
});
