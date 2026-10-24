import { describe, it, expect } from 'vitest';
import {
  runProjectileSimulation,
  validateProjectileParameters,
} from '../../src/core/simulations/projectile';

describe('Projectile Motion Simulation Tests (SIMULATIONS.md J1-J9)', () => {
  const TOLERANCE = 1e-4;

  it('J1: v0=20, theta=45, g=9.81 -> R=40.7747, T=2.8832, H=10.1937', () => {
    const res = runProjectileSimulation({
      initialSpeed: 20,
      angleDeg: 45,
      gravity: 9.81,
    });

    expect(Math.abs(res.range - 40.7747)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(res.flightTime - 2.8832)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(res.maxHeight - 10.1937)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('J2: v0=10, theta=30, g=9.81 -> R=8.8280, T=1.0194, H=1.2742', () => {
    const res = runProjectileSimulation({
      initialSpeed: 10,
      angleDeg: 30,
      gravity: 9.81,
    });

    expect(Math.abs(res.range - 8.8280)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(res.flightTime - 1.0194)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(res.maxHeight - 1.2742)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('J3: v0=20, theta=90, g=9.81 -> R=0, T=4.0775, H=20.3874', () => {
    const res = runProjectileSimulation({
      initialSpeed: 20,
      angleDeg: 90,
      gravity: 9.81,
    });

    expect(res.range).toBe(0);
    expect(Math.abs(res.flightTime - 4.0775)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(res.maxHeight - 20.3874)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('J4: v0=20, theta=0, g=9.81 -> R=0, T=0, H=0 (no flight)', () => {
    const res = runProjectileSimulation({
      initialSpeed: 20,
      angleDeg: 0,
      gravity: 9.81,
    });

    expect(res.range).toBe(0);
    expect(res.flightTime).toBe(0);
    expect(res.maxHeight).toBe(0);
  });

  it('J5: exactly 101 points, first sample is (0,0), last sample y=0', () => {
    const res = runProjectileSimulation({
      initialSpeed: 25,
      angleDeg: 55,
      gravity: 9.81,
    });

    expect(res.trajectory.length).toBe(101);
    expect(res.trajectory[0]).toEqual([0, 0]);
    expect(res.trajectory[100][1]).toBe(0);
    expect(Math.abs(res.trajectory[100][0] - res.range)).toBeLessThanOrEqual(1e-9);
  });

  it('J6: R(45 deg) >= R(any other angle) for same v0, g', () => {
    const r45 = runProjectileSimulation({
      initialSpeed: 30,
      angleDeg: 45,
      gravity: 9.81,
    }).range;

    const testAngles = [5, 15, 30, 44, 46, 60, 75, 85];
    for (const theta of testAngles) {
      const rTheta = runProjectileSimulation({
        initialSpeed: 30,
        angleDeg: theta,
        gravity: 9.81,
      }).range;
      expect(r45).toBeGreaterThanOrEqual(rTheta);
    }
  });

  it('J7: R(30 deg) ~ R(60 deg) within 1e-9', () => {
    const r30 = runProjectileSimulation({
      initialSpeed: 25,
      angleDeg: 30,
      gravity: 9.81,
    }).range;

    const r60 = runProjectileSimulation({
      initialSpeed: 25,
      angleDeg: 60,
      gravity: 9.81,
    }).range;

    expect(Math.abs(r30 - r60)).toBeLessThanOrEqual(1e-9);
  });

  it('J8: v0 = 0, 501, theta = -1, 91, g = 0 -> validation errors', () => {
    const invalidInputs = [
      { initialSpeed: 0, angleDeg: 45, gravity: 9.81 },
      { initialSpeed: 501, angleDeg: 45, gravity: 9.81 },
      { initialSpeed: 20, angleDeg: -1, gravity: 9.81 },
      { initialSpeed: 20, angleDeg: 91, gravity: 9.81 },
      { initialSpeed: 20, angleDeg: 45, gravity: 0 },
      { initialSpeed: 20, angleDeg: 45, gravity: -9.81 },
      { initialSpeed: NaN, angleDeg: 45, gravity: 9.81 },
    ];

    for (const inp of invalidInputs) {
      const v = validateProjectileParameters(inp);
      expect(v.valid).toBe(false);
      expect(v.errors.length).toBeGreaterThan(0);
    }
  });

  it('J9: doubling g halves R', () => {
    const rStandard = runProjectileSimulation({
      initialSpeed: 20,
      angleDeg: 45,
      gravity: 9.81,
    }).range;

    const rDoubleG = runProjectileSimulation({
      initialSpeed: 20,
      angleDeg: 45,
      gravity: 19.62,
    }).range;

    expect(Math.abs(rStandard / 2 - rDoubleG)).toBeLessThanOrEqual(1e-9);
  });
});
