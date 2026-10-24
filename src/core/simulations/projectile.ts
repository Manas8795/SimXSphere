/**
 * Projectile Motion Simulation Engine (Idealized)
 * Strict compliance with SIMULATIONS.md and EXPERIMENT_SCHEMA.md
 * Assumptions: Launch from height 0, flat ground, constant gravity,
 * no air resistance, no spin, no wind.
 * Pure computation. Zero UI / DOM dependencies.
 */

import type { ProjectileParameters, ProjectileResults, ValidationResult } from '../experiment/types';

export const MIN_SPEED = 0.0001; // 0 < v0 <= 500
export const MAX_SPEED = 500;
export const MIN_ANGLE = 0;
export const MAX_ANGLE = 90;
export const MIN_GRAVITY = 0.1;
export const MAX_GRAVITY = 30;

export const GRAVITY_PRESETS = {
  Earth: 9.81,
  Moon: 1.62,
  Mars: 3.71,
} as const;

export function validateProjectileParameters(params: unknown): ValidationResult {
  const errors: string[] = [];

  if (!params || typeof params !== 'object') {
    return { valid: false, errors: ['Parameters must be an object'] };
  }

  const p = params as Partial<ProjectileParameters>;

  // Validate initialSpeed (0 < v0 <= 500)
  if (typeof p.initialSpeed !== 'number' || !Number.isFinite(p.initialSpeed)) {
    errors.push('initialSpeed must be a finite number');
  } else if (p.initialSpeed <= 0 || p.initialSpeed > MAX_SPEED) {
    errors.push(`initialSpeed must be between ${MIN_SPEED} and ${MAX_SPEED} m/s`);
  }

  // Validate angleDeg (0 <= theta <= 90)
  if (typeof p.angleDeg !== 'number' || !Number.isFinite(p.angleDeg)) {
    errors.push('angleDeg must be a finite number');
  } else if (p.angleDeg < MIN_ANGLE || p.angleDeg > MAX_ANGLE) {
    errors.push(`angleDeg must be between ${MIN_ANGLE} and ${MAX_ANGLE} degrees`);
  }

  // Validate gravity (0.1 <= g <= 30)
  if (typeof p.gravity !== 'number' || !Number.isFinite(p.gravity)) {
    errors.push('gravity must be a finite number');
  } else if (p.gravity < MIN_GRAVITY || p.gravity > MAX_GRAVITY) {
    errors.push(`gravity must be between ${MIN_GRAVITY} and ${MAX_GRAVITY} m/s²`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function runProjectileSimulation(params: ProjectileParameters): ProjectileResults {
  const validation = validateProjectileParameters(params);
  if (!validation.valid) {
    throw new Error(`Invalid projectile parameters: ${validation.errors.join('; ')}`);
  }

  const v0 = params.initialSpeed;
  const thetaDeg = params.angleDeg;
  const g = params.gravity;

  const thetaRad = (thetaDeg * Math.PI) / 180;

  // Handle theta = 0 (horizontal launch along ground, no flight)
  if (thetaDeg === 0) {
    const trajectory: [number, number][] = Array.from({ length: 101 }, () => [0, 0]);
    return {
      flightTime: 0,
      range: 0,
      maxHeight: 0,
      trajectory,
    };
  }

  // Standard idealized projectile formulas
  const flightTime = (2 * v0 * Math.sin(thetaRad)) / g;
  let range = (Math.pow(v0, 2) * Math.sin(2 * thetaRad)) / g;
  const maxHeight = Math.pow(v0 * Math.sin(thetaRad), 2) / (2 * g);

  // Clamp near-zero range (e.g. at 90 degrees)
  if (Math.abs(range) < 1e-9 || thetaDeg === 90) {
    range = 0;
  }

  // Generate exactly 101 trajectory points (i = 0..100)
  const trajectory: [number, number][] = [];
  const cosTheta = Math.cos(thetaRad);
  const sinTheta = Math.sin(thetaRad);

  for (let i = 0; i <= 100; i++) {
    const t = (flightTime * i) / 100;
    let x = v0 * cosTheta * t;
    let y = v0 * sinTheta * t - 0.5 * g * Math.pow(t, 2);

    // Clamping rules per SIMULATIONS.md:
    // Clamp |value| < 1e-9 to 0
    if (Math.abs(x) < 1e-9) x = 0;
    if (Math.abs(y) < 1e-9) y = 0;

    // First sample is (0,0); last sample y is exactly 0
    if (i === 0) {
      x = 0;
      y = 0;
    } else if (i === 100) {
      x = range;
      y = 0;
    }

    trajectory.push([x, y]);
  }

  return {
    flightTime,
    range,
    maxHeight,
    trajectory,
  };
}
