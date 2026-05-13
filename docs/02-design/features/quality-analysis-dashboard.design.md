# Design: 품질 분석 대시보드

**작성일**: 2026-05-13

## API 설계

### GET /api/v1/stats/quality-summary
```
Query: from? (ISO date), to? (ISO date)
Response: {
  data: {
    period: { from, to }
    kpi: { totalAlarms, criticalAlarms, totalViolations, avgCpk }
    machineCapability: [{
      machineId, machineCode, name,
      avgCpk, violations,
      status: "CAPABLE"|"MARGINAL"|"INCAPABLE"|"NO_DATA"
    }]
  }
}
```

### GET /api/v1/stats/defect-trend
```
Query: machineId? (string), days? (1-90, default 30)
Response: { data: [{ date, total, critical }] }
```

### GET /api/v1/spc/results
```
Query: machineId (required), limit (default 100)
Response: { data: SpcResult[] }
```

## 프론트엔드 컴포넌트

```
/quality/page.tsx
  - DateRangeSelector (7d/30d/90d)
  - KpiCards x4
  - DefectTrendChart (Recharts LineChart)
  - MachineCapabilityTable (CapabilityRow)

/quality/[machineId]/page.tsx
  - AlarmTrendChart (30d, for this machine)
  - ChannelChart x N (per channel Cpk trend, SVG LineChart)
  - SpcResultsTable (raw 100건)
```

## 색상 기준

| 상태 | Cpk 범위 | 색상 |
|------|---------|------|
| CAPABLE | ≥ 1.33 | emerald |
| MARGINAL | 1.0 ~ 1.33 | amber |
| INCAPABLE | < 1.0 | red |
| NO_DATA | — | gray |
