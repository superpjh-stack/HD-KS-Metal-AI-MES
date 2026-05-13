export type WERuleId = 'RULE_1' | 'RULE_2' | 'RULE_3' | 'RULE_4';

export interface ControlLimits {
  cl: number;
  ucl: number;
  lcl: number;
}

/**
 * Western Electric Rules 1~4 감지.
 * 입력: X-bar 시계열 (오래된 것부터 최신 순), 관리한계
 * 반환: 위반 규칙 ID 배열 (빈 배열이면 정상)
 */
export function detectWesternElectric(
  points: number[],
  { ucl, lcl, cl }: ControlLimits,
): WERuleId[] {
  const violations: WERuleId[] = [];
  if (points.length === 0) return violations;

  const last = points[points.length - 1];

  // Rule 1: 최신 점이 관리한계 밖
  if (last > ucl || last < lcl) {
    violations.push('RULE_1');
  }

  // Rule 2: 연속 9점이 중심선 한쪽
  if (points.length >= 9) {
    const last9 = points.slice(-9);
    if (last9.every((p) => p > cl) || last9.every((p) => p < cl)) {
      violations.push('RULE_2');
    }
  }

  // Rule 3: 연속 6점 단조 증가 또는 단조 감소
  if (points.length >= 6) {
    const last6 = points.slice(-6);
    const ascending  = last6.every((p, i) => i === 0 || p > last6[i - 1]);
    const descending = last6.every((p, i) => i === 0 || p < last6[i - 1]);
    if (ascending || descending) {
      violations.push('RULE_3');
    }
  }

  // Rule 4: 연속 14점 교호 증감 (지그재그)
  if (points.length >= 14) {
    const last14 = points.slice(-14);
    const alternating = last14.every((p, i) => {
      if (i === 0) return true;
      const prev = last14[i - 1];
      return i % 2 === 1 ? p > prev : p < prev;
    });
    // 반대 방향 교호도 허용
    const alternatingRev = last14.every((p, i) => {
      if (i === 0) return true;
      const prev = last14[i - 1];
      return i % 2 === 1 ? p < prev : p > prev;
    });
    if (alternating || alternatingRev) {
      violations.push('RULE_4');
    }
  }

  return violations;
}
