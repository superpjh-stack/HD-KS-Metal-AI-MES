import { StatsService, MinuteBucket } from '../../src/stats/stats.service';
import { Test } from '@nestjs/testing';
import { TS_POOL } from '../../src/timescale/timescale.module';

const mockPool = { query: jest.fn() };

const makeBuckets = (vals: number[]): MinuteBucket[] =>
  vals.map((avg_val, i) => ({ bucket: new Date(Date.now() + i * 60_000), avg_val }));

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: TS_POOL, useValue: mockPool },
      ],
    }).compile();
    service = module.get(StatsService);
  });

  describe('compute', () => {
    it('mean과 std 정확히 계산', () => {
      const buckets = makeBuckets([10, 10, 10, 10, 10]);
      const stats   = service.compute(buckets)!;
      expect(stats.mean).toBeCloseTo(10);
      expect(stats.std).toBeCloseTo(0);
    });

    it('latest = 마지막 값', () => {
      const buckets = makeBuckets([8, 9, 10, 11, 15]);
      const stats   = service.compute(buckets)!;
      expect(stats.latest).toBe(15);
    });

    it('5개 미만이면 null', () => {
      expect(service.compute(makeBuckets([10, 10, 10, 10]))).toBeNull();
    });

    it('n-1 표본분산 사용', () => {
      const buckets = makeBuckets([2, 4, 4, 4, 5, 5, 7, 9]); // 표준편차 = 2
      const stats   = service.compute(buckets)!;
      expect(stats.std).toBeCloseTo(2, 1);
    });
  });

  describe('isAnomaly', () => {
    it('3σ 초과 시 true', () => {
      const stats = { mean: 10, std: 1, count: 60, latest: 14 }; // 4σ 이탈
      expect(service.isAnomaly(stats, 3)).toBe(true);
    });

    it('3σ 이내이면 false', () => {
      const stats = { mean: 10, std: 1, count: 60, latest: 12.5 }; // 2.5σ
      expect(service.isAnomaly(stats, 3)).toBe(false);
    });

    it('음수 방향 이탈도 감지', () => {
      const stats = { mean: 10, std: 1, count: 60, latest: 6 }; // -4σ
      expect(service.isAnomaly(stats, 3)).toBe(true);
    });

    it('std=0 이면 false (상수 데이터)', () => {
      const stats = { mean: 10, std: 0, count: 60, latest: 10 };
      expect(service.isAnomaly(stats, 3)).toBe(false);
    });
  });

  describe('anomalyMessage', () => {
    it('채널명과 측정값이 포함된 메시지', () => {
      const stats  = { mean: 10, std: 1, count: 60, latest: 14 };
      const msg    = service.anomalyMessage('vibration_x', stats, 3);
      expect(msg).toContain('vibration_x');
      expect(msg).toContain('14');
      expect(msg).toContain('4.00σ');
    });
  });
});
