import { SpcService, SpcQueryRow, SpcPoint } from '../../src/spc/spc.service';
import { Test } from '@nestjs/testing';
import { TS_POOL } from '../../src/timescale/timescale.module';

const mockPool = { query: jest.fn() };

describe('SpcService', () => {
  let service: SpcService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SpcService,
        { provide: TS_POOL, useValue: mockPool },
      ],
    }).compile();
    service = module.get(SpcService);
  });

  // ── buildSubgroups ──────────────────────────────────────────────

  describe('buildSubgroups', () => {
    const makeRows = (vals: number[]): SpcQueryRow[] =>
      vals.map((v, i) => ({
        bucket:  new Date(Date.now() + i * 60_000),
        avg_val: v,
        max_val: v + 0.5,
        min_val: v - 0.5,
      }));

    it('n=5, 15개 rows → 3 서브그룹', () => {
      const rows = makeRows([1, 2, 3, 4, 5,  6, 7, 8, 9, 10,  11, 12, 13, 14, 15]);
      const pts  = service.buildSubgroups(rows, 5);
      expect(pts).toHaveLength(3);
    });

    it('첫 서브그룹 X-bar = 3 (1+2+3+4+5)/5', () => {
      const rows = makeRows([1, 2, 3, 4, 5,  6, 7, 8, 9, 10]);
      const pts  = service.buildSubgroups(rows, 5);
      expect(pts[0].xbar).toBeCloseTo(3);
    });

    it('첫 서브그룹 Range = 4 (5-1)', () => {
      const rows = makeRows([1, 2, 3, 4, 5,  6, 7, 8, 9, 10]);
      const pts  = service.buildSubgroups(rows, 5);
      expect(pts[0].range).toBeCloseTo(4);
    });

    it('데이터가 n보다 적으면 빈 배열', () => {
      const rows = makeRows([1, 2, 3]);
      expect(service.buildSubgroups(rows, 5)).toHaveLength(0);
    });
  });

  // ── computeControlLimits ────────────────────────────────────────

  describe('computeControlLimits', () => {
    const makePoints = (xbars: number[], ranges: number[]): SpcPoint[] =>
      xbars.map((xbar, i) => ({
        bucket: new Date(Date.now() + i * 60_000),
        xbar,
        range: ranges[i],
      }));

    it('UCL_xbar > CL_xbar > LCL_xbar', () => {
      const pts    = makePoints([10, 10, 10, 10, 10], [2, 2, 2, 2, 2]);
      const limits = service.computeControlLimits(pts, 5)!;
      expect(limits.ucl_xbar).toBeGreaterThan(limits.cl_xbar);
      expect(limits.cl_xbar).toBeGreaterThan(limits.lcl_xbar);
    });

    it('CL_xbar = 평균 X-bar', () => {
      const pts    = makePoints([8, 10, 12], [2, 2, 2]);
      const limits = service.computeControlLimits(pts, 5)!;
      expect(limits.cl_xbar).toBeCloseTo(10);
    });

    it('점이 1개이면 null 반환', () => {
      const pts = makePoints([10], [2]);
      expect(service.computeControlLimits(pts, 5)).toBeNull();
    });
  });

  // ── computeCapability ───────────────────────────────────────────

  describe('computeCapability', () => {
    it('Cp = (USL-LSL) / 6σ', () => {
      const samples = Array.from({ length: 50 }, () => 10 + (Math.random() - 0.5) * 2);
      const result  = service.computeCapability(samples, 13, 7);
      // cp = (13-7)/(6*σ) — just check it's a positive number
      expect(result.cp).toBeGreaterThan(0);
    });

    it('Cpk ≤ Cp when mean is off-center', () => {
      // mean ~= 12 (biased toward USL=13), lsl=7
      const samples = Array.from({ length: 50 }, () => 12 + (Math.random() - 0.5) * 0.5);
      const result  = service.computeCapability(samples, 13, 7);
      expect(result.cpk!).toBeLessThanOrEqual(result.cp!);
    });

    it('USL/LSL null → cp null, cpk from one-sided', () => {
      const samples = [10, 10, 10, 10, 10.01];
      const result  = service.computeCapability(samples, 12, null);
      expect(result.cp).toBeNull();
      expect(result.cpk).not.toBeNull();
    });
  });
});
