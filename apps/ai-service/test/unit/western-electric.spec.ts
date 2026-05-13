import { detectWesternElectric, ControlLimits } from '../../src/spc/western-electric';

const limits: ControlLimits = { ucl: 15, lcl: 5, cl: 10 };

describe('detectWesternElectric', () => {
  describe('Rule 1 — 관리한계 이탈', () => {
    it('최신 점이 UCL 초과이면 RULE_1 반환', () => {
      const pts = [10, 10, 10, 16];
      expect(detectWesternElectric(pts, limits)).toContain('RULE_1');
    });

    it('최신 점이 LCL 미만이면 RULE_1 반환', () => {
      const pts = [10, 10, 10, 4];
      expect(detectWesternElectric(pts, limits)).toContain('RULE_1');
    });

    it('관리한계 내 정상 점은 RULE_1 없음', () => {
      const pts = [9, 10, 11, 10];
      expect(detectWesternElectric(pts, limits)).not.toContain('RULE_1');
    });
  });

  describe('Rule 2 — 연속 9점 한쪽', () => {
    it('9점 모두 중심선 위이면 RULE_2 반환', () => {
      const pts = Array(9).fill(11); // 모두 > cl(10)
      expect(detectWesternElectric(pts, limits)).toContain('RULE_2');
    });

    it('9점 모두 중심선 아래이면 RULE_2 반환', () => {
      const pts = Array(9).fill(9); // 모두 < cl(10)
      expect(detectWesternElectric(pts, limits)).toContain('RULE_2');
    });

    it('8점만 한쪽이면 RULE_2 없음', () => {
      const pts = [...Array(8).fill(11), 9]; // 마지막이 아래
      expect(detectWesternElectric(pts, limits)).not.toContain('RULE_2');
    });
  });

  describe('Rule 3 — 단조 증가/감소', () => {
    it('연속 6점 단조 증가이면 RULE_3 반환', () => {
      const pts = [7, 8, 9, 10, 11, 12];
      expect(detectWesternElectric(pts, limits)).toContain('RULE_3');
    });

    it('연속 6점 단조 감소이면 RULE_3 반환', () => {
      const pts = [13, 12, 11, 10, 9, 8];
      expect(detectWesternElectric(pts, limits)).toContain('RULE_3');
    });

    it('5점 단조이면 RULE_3 없음', () => {
      const pts = [7, 8, 9, 10, 11];
      expect(detectWesternElectric(pts, limits)).not.toContain('RULE_3');
    });
  });

  describe('Rule 4 — 교호 증감', () => {
    it('14점 지그재그이면 RULE_4 반환', () => {
      // 홀수 인덱스가 짝수 인덱스보다 큰 패턴
      const pts = [9, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9, 11];
      expect(detectWesternElectric(pts, limits)).toContain('RULE_4');
    });

    it('13점만이면 RULE_4 없음', () => {
      const pts = [9, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9];
      expect(detectWesternElectric(pts, limits)).not.toContain('RULE_4');
    });
  });

  it('정상 데이터는 빈 배열 반환', () => {
    const pts = [10, 10.1, 9.9, 10.2, 9.8];
    expect(detectWesternElectric(pts, limits)).toHaveLength(0);
  });

  it('빈 입력은 빈 배열 반환', () => {
    expect(detectWesternElectric([], limits)).toHaveLength(0);
  });
});
