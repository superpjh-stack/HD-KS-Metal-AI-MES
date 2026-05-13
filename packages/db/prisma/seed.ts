import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data (20 per entity)...');

  // ─── 생산 라인 4개 ────────────────────────────────────
  const lines = await Promise.all([
    prisma.productionLine.upsert({ where: { lineCode: 'LINE-A' }, update: {}, create: { lineCode: 'LINE-A', name: '프레스 1라인' } }),
    prisma.productionLine.upsert({ where: { lineCode: 'LINE-B' }, update: {}, create: { lineCode: 'LINE-B', name: '프레스 2라인' } }),
    prisma.productionLine.upsert({ where: { lineCode: 'LINE-C' }, update: {}, create: { lineCode: 'LINE-C', name: '용접/절곡 라인' } }),
    prisma.productionLine.upsert({ where: { lineCode: 'LINE-D' }, update: {}, create: { lineCode: 'LINE-D', name: '검사/조립 라인' } }),
  ]);
  const [lineA, lineB, lineC, lineD] = lines;

  // ─── 설비 20대 ────────────────────────────────────────
  const machineData = [
    { machineCode: 'PRESS-01', name: '1호 프레스 (200T)',   machineType: 'PRESS',      lineId: lineA.id, manufacturer: 'Aida',      status: 'ACTIVE'      },
    { machineCode: 'PRESS-02', name: '2호 프레스 (200T)',   machineType: 'PRESS',      lineId: lineA.id, manufacturer: 'Aida',      status: 'ACTIVE'      },
    { machineCode: 'PRESS-03', name: '3호 프레스 (300T)',   machineType: 'PRESS',      lineId: lineA.id, manufacturer: 'Komatsu',   status: 'ACTIVE'      },
    { machineCode: 'PRESS-04', name: '4호 프레스 (100T)',   machineType: 'PRESS',      lineId: lineA.id, manufacturer: 'Komatsu',   status: 'WARNING'     },
    { machineCode: 'PRESS-05', name: '5호 프레스 (400T)',   machineType: 'PRESS',      lineId: lineB.id, manufacturer: 'Schuler',   status: 'ACTIVE'      },
    { machineCode: 'PRESS-06', name: '6호 프레스 (250T)',   machineType: 'PRESS',      lineId: lineB.id, manufacturer: 'Schuler',   status: 'ACTIVE'      },
    { machineCode: 'PRESS-07', name: '7호 프레스 (160T)',   machineType: 'PRESS',      lineId: lineB.id, manufacturer: 'Aida',      status: 'ACTIVE'      },
    { machineCode: 'PRESS-08', name: '8호 프레스 (500T)',   machineType: 'PRESS',      lineId: lineB.id, manufacturer: 'Schuler',   status: 'MAINTENANCE' },
    { machineCode: 'WELD-01',  name: '1호 용접기 (CO2)',    machineType: 'WELDING',    lineId: lineC.id, manufacturer: 'Panasonic', status: 'ACTIVE'      },
    { machineCode: 'WELD-02',  name: '2호 용접기 (MIG)',    machineType: 'WELDING',    lineId: lineC.id, manufacturer: 'Panasonic', status: 'ACTIVE'      },
    { machineCode: 'WELD-03',  name: '3호 용접기 (TIG)',    machineType: 'WELDING',    lineId: lineC.id, manufacturer: 'Lincoln',   status: 'ACTIVE'      },
    { machineCode: 'WELD-04',  name: '4호 레이저 용접기',   machineType: 'WELDING',    lineId: lineC.id, manufacturer: 'Trumpf',    status: 'ACTIVE'      },
    { machineCode: 'BEND-01',  name: '1호 절곡기 (90T)',    machineType: 'BENDING',    lineId: lineC.id, manufacturer: 'Amada',     status: 'MAINTENANCE' },
    { machineCode: 'BEND-02',  name: '2호 절곡기 (150T)',   machineType: 'BENDING',    lineId: lineC.id, manufacturer: 'Amada',     status: 'ACTIVE'      },
    { machineCode: 'BEND-03',  name: '3호 절곡기 (60T)',    machineType: 'BENDING',    lineId: lineC.id, manufacturer: 'Bystronic', status: 'ACTIVE'      },
    { machineCode: 'INSP-01',  name: '1호 검사기 (CMM)',    machineType: 'INSPECTION', lineId: lineD.id, manufacturer: 'Zeiss',     status: 'ACTIVE'      },
    { machineCode: 'INSP-02',  name: '2호 검사기 (비전)',   machineType: 'INSPECTION', lineId: lineD.id, manufacturer: 'Cognex',    status: 'ACTIVE'      },
    { machineCode: 'INSP-03',  name: '3호 검사기 (X-Ray)',  machineType: 'INSPECTION', lineId: lineD.id, manufacturer: 'Nikon',     status: 'ACTIVE'      },
    { machineCode: 'ASSY-01',  name: '1호 조립라인',        machineType: 'ASSEMBLY',   lineId: lineD.id, manufacturer: '-',         status: 'ACTIVE'      },
    { machineCode: 'ASSY-02',  name: '2호 조립라인',        machineType: 'ASSEMBLY',   lineId: lineD.id, manufacturer: '-',         status: 'ACTIVE'      },
  ];

  const machines: Record<string, string> = {};
  for (const m of machineData) {
    const rec = await prisma.machine.upsert({
      where: { machineCode: m.machineCode },
      update: { status: m.status },
      create: m,
    });
    machines[m.machineCode] = rec.id;
  }

  // ─── 공급처 20개 ──────────────────────────────────────
  const supplierData = [
    { supplierCode: 'POSCO-001',   name: 'POSCO',          contact: 'steel@posco.com'       },
    { supplierCode: 'HYUNDAI-001', name: '현대제철',        contact: 'steel@hyundai.com'     },
    { supplierCode: 'DONGKUK-001', name: '동국제강',        contact: 'info@dongkuk.com'      },
    { supplierCode: 'SEAH-001',    name: '세아제강',        contact: 'info@seah.com'         },
    { supplierCode: 'ILJIN-001',   name: '일진제강',        contact: 'info@iljin.com'        },
    { supplierCode: 'KG-001',      name: 'KG스틸',          contact: 'info@kgsteel.com'      },
    { supplierCode: 'HANIL-001',   name: '한일철강',        contact: 'info@hanil.com'        },
    { supplierCode: 'GLOBAL-001',  name: '글로벌소재',      contact: 'info@global.com'       },
    { supplierCode: 'JINSUNG-001', name: '진성금속',        contact: 'info@jinsung.com'      },
    { supplierCode: 'SAMWON-001',  name: '삼원특수강',      contact: 'info@samwon.com'       },
    { supplierCode: 'DAEHAN-001',  name: '대한철강',        contact: 'info@daehan.com'       },
    { supplierCode: 'CHOSUN-001',  name: '조선내화',        contact: 'info@chosun.com'       },
    { supplierCode: 'YOUNGPOONG-001', name: '영풍',         contact: 'info@youngpoong.com'   },
    { supplierCode: 'KUKDO-001',   name: '국도화학',        contact: 'info@kukdo.com'        },
    { supplierCode: 'SUNGWOO-001', name: '성우하이텍',      contact: 'info@sungwoo.com'      },
    { supplierCode: 'EUNYANG-001', name: '은양산업',        contact: 'info@eunyang.com'      },
    { supplierCode: 'TAEKWANG-001',name: '태광산업',        contact: 'info@taekwang.com'     },
    { supplierCode: 'KORTEK-001',  name: '코텍',            contact: 'info@kortek.com'       },
    { supplierCode: 'NAMIL-001',   name: '남일철강',        contact: 'info@namil.com'        },
    { supplierCode: 'SINKWANG-001',name: '신광금속',        contact: 'info@sinkwang.com'     },
  ];

  const suppliers: Record<string, string> = {};
  for (const s of supplierData) {
    const rec = await prisma.supplier.upsert({
      where: { supplierCode: s.supplierCode },
      update: {},
      create: s,
    });
    suppliers[s.supplierCode] = rec.id;
  }

  // ─── 자재 20종 ────────────────────────────────────────
  const materialData = [
    { materialCode: 'SPCC-1.0T',  name: '냉연강판 1.0T',      unit: 'kg' },
    { materialCode: 'SPCC-1.2T',  name: '냉연강판 1.2T',      unit: 'kg' },
    { materialCode: 'SPCC-1.6T',  name: '냉연강판 1.6T',      unit: 'kg' },
    { materialCode: 'SPCC-2.0T',  name: '냉연강판 2.0T',      unit: 'kg' },
    { materialCode: 'SPHC-2.3T',  name: '열연강판 2.3T',      unit: 'kg' },
    { materialCode: 'SPHC-3.2T',  name: '열연강판 3.2T',      unit: 'kg' },
    { materialCode: 'SPHC-4.5T',  name: '열연강판 4.5T',      unit: 'kg' },
    { materialCode: 'STS304-1T',  name: '스테인리스 304 1T',  unit: 'kg' },
    { materialCode: 'STS304-2T',  name: '스테인리스 304 2T',  unit: 'kg' },
    { materialCode: 'STS430-1T',  name: '스테인리스 430 1T',  unit: 'kg' },
    { materialCode: 'AL5052-2T',  name: '알루미늄 5052 2T',   unit: 'kg' },
    { materialCode: 'AL6061-3T',  name: '알루미늄 6061 3T',   unit: 'kg' },
    { materialCode: 'GI-0.8T',    name: '아연도금강판 0.8T',  unit: 'kg' },
    { materialCode: 'GI-1.0T',    name: '아연도금강판 1.0T',  unit: 'kg' },
    { materialCode: 'EGI-0.8T',   name: '전기아연강판 0.8T',  unit: 'kg' },
    { materialCode: 'EGI-1.2T',   name: '전기아연강판 1.2T',  unit: 'kg' },
    { materialCode: 'CR-1.5T',    name: '크롬강판 1.5T',      unit: 'kg' },
    { materialCode: 'PIPE-25A',   name: '강관 25A',           unit: 'm'  },
    { materialCode: 'PIPE-50A',   name: '강관 50A',           unit: 'm'  },
    { materialCode: 'ROD-12MM',   name: '환봉 φ12',           unit: 'kg' },
  ];

  const materials: Record<string, string> = {};
  for (const m of materialData) {
    const rec = await prisma.material.upsert({
      where: { materialCode: m.materialCode },
      update: {},
      create: m,
    });
    materials[m.materialCode] = rec.id;
  }

  // ─── 사용자 20명 ──────────────────────────────────────
  const userData = [
    { email: 'admin@ks-mes.local',     name: '시스템 관리자', department: 'IT',    roles: ['ADMIN']     },
    { email: 'manager1@ks-mes.local',  name: '김공장장',      department: '생산',  roles: ['MANAGER']   },
    { email: 'manager2@ks-mes.local',  name: '이부장',        department: '품질',  roles: ['MANAGER']   },
    { email: 'manager3@ks-mes.local',  name: '박생산팀장',    department: '생산',  roles: ['MANAGER']   },
    { email: 'manager4@ks-mes.local',  name: '최품질팀장',    department: '품질',  roles: ['MANAGER']   },
    { email: 'op1@ks-mes.local',       name: '박작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op2@ks-mes.local',       name: '최작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op3@ks-mes.local',       name: '정작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op4@ks-mes.local',       name: '강작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op5@ks-mes.local',       name: '조작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op6@ks-mes.local',       name: '윤작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op7@ks-mes.local',       name: '임작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'op8@ks-mes.local',       name: '한작업자',      department: '생산',  roles: ['OPERATOR']  },
    { email: 'insp1@ks-mes.local',     name: '강검사원',      department: '품질',  roles: ['INSPECTOR'] },
    { email: 'insp2@ks-mes.local',     name: '조검사원',      department: '품질',  roles: ['INSPECTOR'] },
    { email: 'insp3@ks-mes.local',     name: '신검사원',      department: '품질',  roles: ['INSPECTOR'] },
    { email: 'insp4@ks-mes.local',     name: '류검사원',      department: '품질',  roles: ['INSPECTOR'] },
    { email: 'viewer1@ks-mes.local',   name: '한모니터',      department: '경영',  roles: ['VIEWER']    },
    { email: 'viewer2@ks-mes.local',   name: '윤경영진',      department: '경영',  roles: ['VIEWER']    },
    { email: 'viewer3@ks-mes.local',   name: '오임원',        department: '경영',  roles: ['VIEWER']    },
  ];

  const users: Record<string, string> = {};
  for (const u of userData) {
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    users[u.email] = rec.id;
  }

  const adminId  = users['admin@ks-mes.local'];
  const manager1 = users['manager1@ks-mes.local'];

  // ─── 금형 20개 ────────────────────────────────────────
  const moldData = [
    { moldCode: 'MOLD-A001', name: '브라켓 금형 A',     maxStrokes: 500000, totalStrokes: 123400 },
    { moldCode: 'MOLD-A002', name: '브라켓 금형 B',     maxStrokes: 500000, totalStrokes: 287600 },
    { moldCode: 'MOLD-A003', name: '브라켓 금형 C',     maxStrokes: 500000, totalStrokes: 441200 },
    { moldCode: 'MOLD-B001', name: '패널 금형 (대)',     maxStrokes: 300000, totalStrokes: 256000 },
    { moldCode: 'MOLD-B002', name: '패널 금형 (소)',     maxStrokes: 300000, totalStrokes:  89000 },
    { moldCode: 'MOLD-B003', name: '패널 금형 (중)',     maxStrokes: 300000, totalStrokes: 178000 },
    { moldCode: 'MOLD-C001', name: '커버 금형 A형',     maxStrokes: 400000, totalStrokes: 198000 },
    { moldCode: 'MOLD-C002', name: '커버 금형 B형',     maxStrokes: 400000, totalStrokes: 375000 },
    { moldCode: 'MOLD-C003', name: '커버 금형 C형',     maxStrokes: 400000, totalStrokes:  67000 },
    { moldCode: 'MOLD-D001', name: '클립 금형 (상)',     maxStrokes: 800000, totalStrokes: 612000 },
    { moldCode: 'MOLD-D002', name: '클립 금형 (하)',     maxStrokes: 800000, totalStrokes: 241000 },
    { moldCode: 'MOLD-D003', name: '클립 금형 (측면)',   maxStrokes: 800000, totalStrokes: 490000 },
    { moldCode: 'MOLD-E001', name: '힌지 금형',          maxStrokes: 600000, totalStrokes: 389000 },
    { moldCode: 'MOLD-E002', name: '힌지 금형 (소)',     maxStrokes: 600000, totalStrokes: 150000 },
    { moldCode: 'MOLD-F001', name: '가이드레일 금형',   maxStrokes: 200000, totalStrokes:  34000 },
    { moldCode: 'MOLD-F002', name: '가이드레일 금형 B', maxStrokes: 200000, totalStrokes: 189000 },
    { moldCode: 'MOLD-G001', name: '샤프트 금형',        maxStrokes: 700000, totalStrokes: 320000 },
    { moldCode: 'MOLD-G002', name: '샤프트 금형 (대)',   maxStrokes: 700000, totalStrokes: 635000 },
    { moldCode: 'MOLD-H001', name: '플랜지 금형',        maxStrokes: 450000, totalStrokes: 210000 },
    { moldCode: 'MOLD-H002', name: '플랜지 금형 (소)',   maxStrokes: 450000, totalStrokes:  45000 },
  ];

  const molds: Record<string, string> = {};
  for (const m of moldData) {
    const rec = await prisma.mold.upsert({
      where: { moldCode: m.moldCode },
      update: { totalStrokes: m.totalStrokes },
      create: { ...m, status: m.totalStrokes / m.maxStrokes > 0.9 ? 'WARNING' : 'ACTIVE' },
    });
    molds[m.moldCode] = rec.id;
  }

  // ─── 작업 지시 20건 ───────────────────────────────────
  const now = new Date();
  const d = (offsetHours: number) => new Date(now.getTime() + offsetHours * 3_600_000);

  const woData = [
    { woNumber: 'WO-2026-0001', productCode: 'BKT-A100', mc: 'PRESS-01', mold: 'MOLD-A001', pQty: 5000, aQty: 5000, dQty:  23, status: 'COMPLETED',   ps: d(-72), pe: d(-64), as_: d(-72), ae: d(-64), op: 'op1@ks-mes.local'     },
    { woNumber: 'WO-2026-0002', productCode: 'PNL-B200', mc: 'PRESS-02', mold: 'MOLD-B001', pQty: 3000, aQty: 3000, dQty:  45, status: 'COMPLETED',   ps: d(-60), pe: d(-52), as_: d(-60), ae: d(-53), op: 'op2@ks-mes.local'     },
    { woNumber: 'WO-2026-0003', productCode: 'CVR-C300', mc: 'PRESS-03', mold: 'MOLD-C001', pQty: 4000, aQty: 4000, dQty:  18, status: 'COMPLETED',   ps: d(-48), pe: d(-40), as_: d(-48), ae: d(-40), op: 'op1@ks-mes.local'     },
    { woNumber: 'WO-2026-0004', productCode: 'CLP-D400', mc: 'PRESS-05', mold: 'MOLD-D001', pQty: 8000, aQty: 8000, dQty: 105, status: 'COMPLETED',   ps: d(-48), pe: d(-38), as_: d(-48), ae: d(-38), op: 'op3@ks-mes.local'     },
    { woNumber: 'WO-2026-0005', productCode: 'HNG-E500', mc: 'PRESS-06', mold: 'MOLD-E001', pQty: 6000, aQty: 6000, dQty:  34, status: 'COMPLETED',   ps: d(-36), pe: d(-28), as_: d(-36), ae: d(-29), op: 'op4@ks-mes.local'     },
    { woNumber: 'WO-2026-0006', productCode: 'BKT-A100', mc: 'PRESS-07', mold: 'MOLD-A002', pQty: 5000, aQty: 5000, dQty:  61, status: 'COMPLETED',   ps: d(-36), pe: d(-28), as_: d(-36), ae: d(-28), op: 'op5@ks-mes.local'     },
    { woNumber: 'WO-2026-0007', productCode: 'PNL-B200', mc: 'PRESS-01', mold: 'MOLD-B002', pQty: 3000, aQty: 3000, dQty:  29, status: 'COMPLETED',   ps: d(-24), pe: d(-16), as_: d(-24), ae: d(-16), op: 'op6@ks-mes.local'     },
    { woNumber: 'WO-2026-0008', productCode: 'GRL-F600', mc: 'PRESS-02', mold: 'MOLD-F001', pQty: 2000, aQty: 2000, dQty:  11, status: 'COMPLETED',   ps: d(-24), pe: d(-18), as_: d(-24), ae: d(-18), op: 'op2@ks-mes.local'     },
    { woNumber: 'WO-2026-0009', productCode: 'SHF-G700', mc: 'PRESS-03', mold: 'MOLD-G001', pQty: 4500, aQty: 4500, dQty:  87, status: 'COMPLETED',   ps: d(-20), pe: d(-12), as_: d(-20), ae: d(-12), op: 'op7@ks-mes.local'     },
    { woNumber: 'WO-2026-0010', productCode: 'FLG-H800', mc: 'PRESS-05', mold: 'MOLD-H001', pQty: 3500, aQty: 3500, dQty:  42, status: 'COMPLETED',   ps: d(-18), pe: d(-10), as_: d(-18), ae: d(-10), op: 'op8@ks-mes.local'     },
    { woNumber: 'WO-2026-0011', productCode: 'BKT-A100', mc: 'PRESS-01', mold: 'MOLD-A003', pQty: 5000, aQty: 3200, dQty:  67, status: 'IN_PROGRESS', ps: d(-8),  pe: d(4),  as_: d(-8),  ae: null,   op: 'op1@ks-mes.local'     },
    { woNumber: 'WO-2026-0012', productCode: 'CLP-D400', mc: 'PRESS-02', mold: 'MOLD-D002', pQty: 8000, aQty: 2800, dQty:  12, status: 'IN_PROGRESS', ps: d(-4),  pe: d(8),  as_: d(-4),  ae: null,   op: 'op2@ks-mes.local'     },
    { woNumber: 'WO-2026-0013', productCode: 'HNG-E500', mc: 'PRESS-05', mold: 'MOLD-E002', pQty: 6000, aQty: 1500, dQty:   8, status: 'IN_PROGRESS', ps: d(-2),  pe: d(10), as_: d(-2),  ae: null,   op: 'op3@ks-mes.local'     },
    { woNumber: 'WO-2026-0014', productCode: 'PNL-B200', mc: 'PRESS-06', mold: 'MOLD-B003', pQty: 3500, aQty: 900,  dQty:   5, status: 'IN_PROGRESS', ps: d(-1),  pe: d(7),  as_: d(-1),  ae: null,   op: 'op4@ks-mes.local'     },
    { woNumber: 'WO-2026-0015', productCode: 'CVR-C300', mc: 'PRESS-04', mold: 'MOLD-C002', pQty: 4000, aQty: 1200, dQty:  56, status: 'ON_HOLD',     ps: d(-12), pe: d(0),  as_: d(-12), ae: null,   op: 'op2@ks-mes.local'     },
    { woNumber: 'WO-2026-0016', productCode: 'GRL-F600', mc: 'PRESS-06', mold: 'MOLD-F002', pQty: 2000, aQty:   0,  dQty:   0, status: 'PLANNED',     ps: d(2),   pe: d(10), as_: null,   ae: null,   op: null                   },
    { woNumber: 'WO-2026-0017', productCode: 'PNL-B200', mc: 'PRESS-03', mold: 'MOLD-B001', pQty: 3500, aQty:   0,  dQty:   0, status: 'PLANNED',     ps: d(4),   pe: d(12), as_: null,   ae: null,   op: null                   },
    { woNumber: 'WO-2026-0018', productCode: 'SHF-G700', mc: 'PRESS-07', mold: 'MOLD-G002', pQty: 4000, aQty:   0,  dQty:   0, status: 'PLANNED',     ps: d(6),   pe: d(14), as_: null,   ae: null,   op: null                   },
    { woNumber: 'WO-2026-0019', productCode: 'FLG-H800', mc: 'PRESS-01', mold: 'MOLD-H002', pQty: 3000, aQty:   0,  dQty:   0, status: 'PLANNED',     ps: d(8),   pe: d(16), as_: null,   ae: null,   op: null                   },
    { woNumber: 'WO-2026-0020', productCode: 'BKT-A100', mc: 'PRESS-02', mold: 'MOLD-A001', pQty: 5000, aQty:   0,  dQty:   0, status: 'PLANNED',     ps: d(10),  pe: d(18), as_: null,   ae: null,   op: null                   },
  ];

  const workOrders: Record<string, string> = {};
  for (const w of woData) {
    const rec = await prisma.workOrder.upsert({
      where: { woNumber: w.woNumber },
      update: { producedQty: w.aQty, status: w.status as any },
      create: {
        woNumber:    w.woNumber,
        productCode: w.productCode,
        machineId:   machines[w.mc],
        moldId:      molds[w.mold],
        plannedQty:  w.pQty,
        producedQty: w.aQty,
        defectQty:   w.dQty,
        status:      w.status as any,
        plannedStart: w.ps,
        plannedEnd:   w.pe,
        actualStart:  w.as_ ?? undefined,
        actualEnd:    w.ae  ?? undefined,
        operatorId:   w.op ? users[w.op] : undefined,
        createdById:  adminId,
      },
    });
    workOrders[w.woNumber] = rec.id;
  }

  // ─── LOT 20개 ─────────────────────────────────────────
  const lotData = [
    { lotNumber: 'LOT-2026-0001', lotType: 'MATERIAL', mat: 'SPCC-1.2T', sup: 'POSCO-001',    qty: 5000, unit: 'kg', status: 'USED'    },
    { lotNumber: 'LOT-2026-0002', lotType: 'MATERIAL', mat: 'SPCC-1.6T', sup: 'HYUNDAI-001',  qty: 3000, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0003', lotType: 'MATERIAL', mat: 'SPHC-2.3T', sup: 'POSCO-001',    qty: 4000, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0004', lotType: 'MATERIAL', mat: 'STS304-1T', sup: 'SEAH-001',     qty: 1000, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0005', lotType: 'MATERIAL', mat: 'AL5052-2T', sup: 'GLOBAL-001',   qty: 2000, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0006', lotType: 'MATERIAL', mat: 'GI-1.0T',   sup: 'KG-001',       qty: 6000, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0007', lotType: 'MATERIAL', mat: 'SPCC-2.0T', sup: 'DONGKUK-001',  qty: 3500, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0008', lotType: 'MATERIAL', mat: 'EGI-0.8T',  sup: 'ILJIN-001',    qty: 2500, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0009', lotType: 'MATERIAL', mat: 'SPHC-3.2T', sup: 'POSCO-001',    qty: 4500, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0010', lotType: 'MATERIAL', mat: 'CR-1.5T',   sup: 'SAMWON-001',   qty: 1500, unit: 'kg', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0011', lotType: 'WIP',      mat: 'SPCC-1.2T', sup: 'POSCO-001',    qty: 1500, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0012', lotType: 'WIP',      mat: 'SPCC-1.6T', sup: 'HYUNDAI-001',  qty:  800, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0013', lotType: 'WIP',      mat: 'SPHC-2.3T', sup: 'POSCO-001',    qty: 1200, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0014', lotType: 'WIP',      mat: 'AL5052-2T', sup: 'GLOBAL-001',   qty:  600, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0015', lotType: 'WIP',      mat: 'GI-1.0T',   sup: 'KG-001',       qty:  950, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0016', lotType: 'PRODUCT',  mat: 'SPCC-1.2T', sup: 'POSCO-001',    qty: 4977, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0017', lotType: 'PRODUCT',  mat: 'SPHC-2.3T', sup: 'POSCO-001',    qty: 2955, unit: 'ea', status: 'SHIPPED' },
    { lotNumber: 'LOT-2026-0018', lotType: 'PRODUCT',  mat: 'SPCC-1.6T', sup: 'HYUNDAI-001',  qty: 3000, unit: 'ea', status: 'ACTIVE'  },
    { lotNumber: 'LOT-2026-0019', lotType: 'PRODUCT',  mat: 'GI-1.0T',   sup: 'KG-001',       qty: 1980, unit: 'ea', status: 'SHIPPED' },
    { lotNumber: 'LOT-2026-0020', lotType: 'PRODUCT',  mat: 'STS304-1T', sup: 'SEAH-001',     qty:  890, unit: 'ea', status: 'ACTIVE'  },
  ];

  const lots: string[] = [];
  for (const l of lotData) {
    const rec = await prisma.lot.upsert({
      where: { lotNumber: l.lotNumber },
      update: {},
      create: {
        lotNumber:   l.lotNumber,
        lotType:     l.lotType as any,
        materialId:  materials[l.mat],
        supplierId:  suppliers[l.sup],
        quantity:    l.qty,
        unit:        l.unit,
        status:      l.status as any,
        createdById: adminId,
      },
    });
    lots.push(rec.id);
  }

  // ─── LOT 이벤트 20건 ──────────────────────────────────
  const lotEventData = [
    { lotIdx: 0,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op1@ks-mes.local',     offsetH: -70 },
    { lotIdx: 0,  eventType: 'ISSUED',    mc: 'PRESS-01', wo: 'WO-2026-0001',   opEmail: 'op1@ks-mes.local',     offsetH: -72 },
    { lotIdx: 1,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op2@ks-mes.local',     offsetH: -65 },
    { lotIdx: 2,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op1@ks-mes.local',     offsetH: -62 },
    { lotIdx: 3,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op3@ks-mes.local',     offsetH: -55 },
    { lotIdx: 4,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op4@ks-mes.local',     offsetH: -50 },
    { lotIdx: 5,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op5@ks-mes.local',     offsetH: -46 },
    { lotIdx: 10, eventType: 'PRODUCED',  mc: 'PRESS-01', wo: 'WO-2026-0001',   opEmail: 'op1@ks-mes.local',     offsetH: -64 },
    { lotIdx: 10, eventType: 'QC_PASSED', mc: 'INSP-01',  wo: null,             opEmail: 'insp1@ks-mes.local',   offsetH: -62 },
    { lotIdx: 11, eventType: 'PRODUCED',  mc: 'PRESS-02', wo: 'WO-2026-0002',   opEmail: 'op2@ks-mes.local',     offsetH: -52 },
    { lotIdx: 15, eventType: 'PRODUCED',  mc: 'PRESS-01', wo: 'WO-2026-0001',   opEmail: 'op1@ks-mes.local',     offsetH: -65 },
    { lotIdx: 15, eventType: 'QC_PASSED', mc: 'INSP-01',  wo: null,             opEmail: 'insp1@ks-mes.local',   offsetH: -63 },
    { lotIdx: 16, eventType: 'PRODUCED',  mc: 'PRESS-02', wo: 'WO-2026-0002',   opEmail: 'op2@ks-mes.local',     offsetH: -53 },
    { lotIdx: 16, eventType: 'QC_PASSED', mc: 'INSP-02',  wo: null,             opEmail: 'insp2@ks-mes.local',   offsetH: -51 },
    { lotIdx: 16, eventType: 'SHIPPED',   mc: null,       wo: null,             opEmail: 'manager1@ks-mes.local', offsetH: -20 },
    { lotIdx: 17, eventType: 'PRODUCED',  mc: 'PRESS-05', wo: 'WO-2026-0005',   opEmail: 'op4@ks-mes.local',     offsetH: -29 },
    { lotIdx: 17, eventType: 'QC_PASSED', mc: 'INSP-01',  wo: null,             opEmail: 'insp3@ks-mes.local',   offsetH: -27 },
    { lotIdx: 18, eventType: 'SHIPPED',   mc: null,       wo: null,             opEmail: 'manager1@ks-mes.local', offsetH: -15 },
    { lotIdx: 6,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op6@ks-mes.local',     offsetH: -40 },
    { lotIdx: 7,  eventType: 'RECEIVED',  mc: null,       wo: null,             opEmail: 'op7@ks-mes.local',     offsetH: -38 },
  ];

  for (const e of lotEventData) {
    await prisma.lotEvent.create({
      data: {
        lotId:       lots[e.lotIdx],
        eventType:   e.eventType,
        machineId:   e.mc   ? machines[e.mc]        : undefined,
        workOrderId: e.wo   ? workOrders[e.wo]       : undefined,
        operatorId:  e.opEmail ? users[e.opEmail]    : undefined,
        occurredAt:  d(e.offsetH),
        payload:     { note: `${e.eventType} 처리 완료` },
      },
    });
  }

  // ─── 알람 규칙 20개 ───────────────────────────────────
  const alarmRuleData = [
    { mc: 'PRESS-01', channel: 'vibration_x', ruleType: 'THRESHOLD',        threshold: 15.0,  severity: 'WARNING'  },
    { mc: 'PRESS-01', channel: 'vibration_x', ruleType: 'WESTERN_ELECTRIC', threshold: null,  severity: 'CRITICAL' },
    { mc: 'PRESS-01', channel: 'temperature',  ruleType: 'THRESHOLD',        threshold: 85.0,  severity: 'WARNING'  },
    { mc: 'PRESS-01', channel: 'power_kw',    ruleType: 'SIGMA',            threshold: null,  severity: 'WARNING'  },
    { mc: 'PRESS-02', channel: 'vibration_y', ruleType: 'THRESHOLD',        threshold: 15.0,  severity: 'WARNING'  },
    { mc: 'PRESS-02', channel: 'temperature',  ruleType: 'THRESHOLD',        threshold: 85.0,  severity: 'WARNING'  },
    { mc: 'PRESS-02', channel: 'vibration_y', ruleType: 'WESTERN_ELECTRIC', threshold: null,  severity: 'CRITICAL' },
    { mc: 'PRESS-03', channel: 'power_kw',    ruleType: 'SIGMA',            threshold: null,  severity: 'WARNING'  },
    { mc: 'PRESS-03', channel: 'vibration_x', ruleType: 'WESTERN_ELECTRIC', threshold: null,  severity: 'CRITICAL' },
    { mc: 'PRESS-03', channel: 'temperature',  ruleType: 'THRESHOLD',        threshold: 88.0,  severity: 'WARNING'  },
    { mc: 'PRESS-04', channel: 'current',     ruleType: 'THRESHOLD',        threshold: 45.0,  severity: 'CRITICAL' },
    { mc: 'PRESS-04', channel: 'vibration_x', ruleType: 'THRESHOLD',        threshold: 18.0,  severity: 'WARNING'  },
    { mc: 'PRESS-05', channel: 'vibration_x', ruleType: 'THRESHOLD',        threshold: 20.0,  severity: 'WARNING'  },
    { mc: 'PRESS-05', channel: 'temperature',  ruleType: 'THRESHOLD',        threshold: 90.0,  severity: 'WARNING'  },
    { mc: 'PRESS-06', channel: 'vibration_x', ruleType: 'THRESHOLD',        threshold: 18.0,  severity: 'WARNING'  },
    { mc: 'PRESS-07', channel: 'vibration_x', ruleType: 'THRESHOLD',        threshold: 16.0,  severity: 'WARNING'  },
    { mc: 'WELD-01',  channel: 'temperature',  ruleType: 'THRESHOLD',        threshold: 120.0, severity: 'CRITICAL' },
    { mc: 'WELD-02',  channel: 'temperature',  ruleType: 'THRESHOLD',        threshold: 120.0, severity: 'CRITICAL' },
    { mc: 'BEND-02',  channel: 'current',      ruleType: 'THRESHOLD',        threshold: 40.0,  severity: 'WARNING'  },
    { mc: 'INSP-01',  channel: 'vibration_x',  ruleType: 'THRESHOLD',        threshold: 5.0,   severity: 'WARNING'  },
  ];

  const alarmRules: string[] = [];
  for (const r of alarmRuleData) {
    const rec = await prisma.alarmRule.upsert({
      where: {
        machineId_channel_ruleType: {
          machineId: machines[r.mc],
          channel:   r.channel,
          ruleType:  r.ruleType as any,
        },
      },
      update: {},
      create: {
        machineId: machines[r.mc],
        channel:   r.channel,
        ruleType:  r.ruleType as any,
        threshold: r.threshold ?? undefined,
        severity:  r.severity as any,
        enabled:   true,
      },
    });
    alarmRules.push(rec.id);
  }

  // ─── 알람 이벤트 20건 ─────────────────────────────────
  const alarmEventData = [
    { ri: 0,  mc: 'PRESS-01', ch: 'vibration_x', sev: 'WARNING',  val: 16.2,  thr: 15.0,  oh: -46, msg: 'PRESS-01 vibration_x 임계치 초과 (16.2)' },
    { ri: 1,  mc: 'PRESS-01', ch: 'vibration_x', sev: 'CRITICAL', val: 18.7,  thr: 15.0,  oh: -40, msg: 'PRESS-01 WE Rule 1: 3σ 초과점 감지'     },
    { ri: 2,  mc: 'PRESS-01', ch: 'temperature',  sev: 'WARNING',  val: 87.3,  thr: 85.0,  oh: -36, msg: 'PRESS-01 온도 임계치 초과 (87.3°C)'      },
    { ri: 3,  mc: 'PRESS-01', ch: 'power_kw',    sev: 'WARNING',  val: 145.2, thr: null,  oh: -30, msg: 'PRESS-01 power_kw 3σ 이상 (145.2 kW)'    },
    { ri: 4,  mc: 'PRESS-02', ch: 'vibration_y', sev: 'WARNING',  val: 17.1,  thr: 15.0,  oh: -28, msg: 'PRESS-02 vibration_y 임계치 초과 (17.1)' },
    { ri: 5,  mc: 'PRESS-02', ch: 'temperature',  sev: 'WARNING',  val: 88.5,  thr: 85.0,  oh: -24, msg: 'PRESS-02 온도 임계치 초과 (88.5°C)'      },
    { ri: 6,  mc: 'PRESS-02', ch: 'vibration_y', sev: 'CRITICAL', val: 19.4,  thr: null,  oh: -20, msg: 'PRESS-02 WE Rule 2: 연속 편측 감지'       },
    { ri: 7,  mc: 'PRESS-03', ch: 'power_kw',    sev: 'WARNING',  val: 188.3, thr: null,  oh: -18, msg: 'PRESS-03 power_kw 3σ 이상 (188.3 kW)'    },
    { ri: 8,  mc: 'PRESS-03', ch: 'vibration_x', sev: 'CRITICAL', val: 22.4,  thr: null,  oh: -14, msg: 'PRESS-03 WE Rule 1: 3σ 초과점 감지'      },
    { ri: 9,  mc: 'PRESS-03', ch: 'temperature',  sev: 'WARNING',  val: 90.1,  thr: 88.0,  oh: -12, msg: 'PRESS-03 온도 임계치 초과 (90.1°C)'      },
    { ri: 10, mc: 'PRESS-04', ch: 'current',     sev: 'CRITICAL', val: 48.9,  thr: 45.0,  oh: -10, msg: 'PRESS-04 전류 임계치 초과 (48.9A)'        },
    { ri: 11, mc: 'PRESS-04', ch: 'vibration_x', sev: 'WARNING',  val: 19.2,  thr: 18.0,  oh: -8,  msg: 'PRESS-04 vibration_x 임계치 초과 (19.2)' },
    { ri: 12, mc: 'PRESS-05', ch: 'vibration_x', sev: 'WARNING',  val: 21.3,  thr: 20.0,  oh: -6,  msg: 'PRESS-05 vibration_x 임계치 초과 (21.3)' },
    { ri: 13, mc: 'PRESS-05', ch: 'temperature',  sev: 'WARNING',  val: 92.4,  thr: 90.0,  oh: -5,  msg: 'PRESS-05 온도 임계치 초과 (92.4°C)'      },
    { ri: 14, mc: 'PRESS-06', ch: 'vibration_x', sev: 'WARNING',  val: 19.7,  thr: 18.0,  oh: -4,  msg: 'PRESS-06 vibration_x 임계치 초과 (19.7)' },
    { ri: 15, mc: 'PRESS-07', ch: 'vibration_x', sev: 'WARNING',  val: 17.5,  thr: 16.0,  oh: -3,  msg: 'PRESS-07 vibration_x 임계치 초과 (17.5)' },
    { ri: 16, mc: 'WELD-01',  ch: 'temperature',  sev: 'CRITICAL', val: 128.4, thr: 120.0, oh: -2,  msg: 'WELD-01 용접온도 임계치 초과 (128.4°C)'  },
    { ri: 17, mc: 'WELD-02',  ch: 'temperature',  sev: 'CRITICAL', val: 125.1, thr: 120.0, oh: -1,  msg: 'WELD-02 용접온도 임계치 초과 (125.1°C)'  },
    { ri: 18, mc: 'BEND-02',  ch: 'current',      sev: 'WARNING',  val: 42.1,  thr: 40.0,  oh: -0.5, msg: 'BEND-02 전류 임계치 초과 (42.1A)'      },
    { ri: 0,  mc: 'PRESS-01', ch: 'vibration_x', sev: 'WARNING',  val: 15.8,  thr: 15.0,  oh: -0.3, msg: 'PRESS-01 vibration_x 임계치 초과 (15.8)' },
  ];

  for (const e of alarmEventData) {
    await prisma.alarmEvent.create({
      data: {
        ruleId:    alarmRules[e.ri],
        machineId: machines[e.mc],
        channel:   e.ch,
        severity:  e.sev as any,
        value:     e.val,
        threshold: e.thr ?? undefined,
        message:   e.msg,
        occurredAt: d(e.oh),
      },
    });
  }

  // ─── SPC 파라미터 20개 ────────────────────────────────
  const spcParamData = [
    { mc: 'PRESS-01', ch: 'vibration_x', usl: 18.0,  lsl: 0.0  },
    { mc: 'PRESS-01', ch: 'vibration_y', usl: 18.0,  lsl: 0.0  },
    { mc: 'PRESS-01', ch: 'temperature',  usl: 90.0,  lsl: 10.0 },
    { mc: 'PRESS-01', ch: 'power_kw',    usl: 160.0, lsl: 20.0 },
    { mc: 'PRESS-02', ch: 'vibration_y', usl: 18.0,  lsl: 0.0  },
    { mc: 'PRESS-02', ch: 'temperature',  usl: 90.0,  lsl: 10.0 },
    { mc: 'PRESS-02', ch: 'current',     usl: 40.0,  lsl: 0.0  },
    { mc: 'PRESS-03', ch: 'vibration_x', usl: 18.0,  lsl: 0.0  },
    { mc: 'PRESS-03', ch: 'power_kw',    usl: 200.0, lsl: 30.0 },
    { mc: 'PRESS-03', ch: 'temperature',  usl: 90.0,  lsl: 10.0 },
    { mc: 'PRESS-04', ch: 'current',     usl: 50.0,  lsl: 0.0  },
    { mc: 'PRESS-04', ch: 'vibration_x', usl: 20.0,  lsl: 0.0  },
    { mc: 'PRESS-05', ch: 'vibration_x', usl: 22.0,  lsl: 0.0  },
    { mc: 'PRESS-05', ch: 'temperature',  usl: 92.0,  lsl: 10.0 },
    { mc: 'PRESS-06', ch: 'vibration_x', usl: 20.0,  lsl: 0.0  },
    { mc: 'PRESS-06', ch: 'power_kw',    usl: 180.0, lsl: 20.0 },
    { mc: 'PRESS-07', ch: 'vibration_x', usl: 18.0,  lsl: 0.0  },
    { mc: 'WELD-01',  ch: 'temperature',  usl: 130.0, lsl: 50.0 },
    { mc: 'WELD-02',  ch: 'temperature',  usl: 130.0, lsl: 50.0 },
    { mc: 'BEND-02',  ch: 'current',     usl: 45.0,  lsl: 0.0  },
  ];

  for (const p of spcParamData) {
    await prisma.spcParameter.upsert({
      where: { machineId_channel: { machineId: machines[p.mc], channel: p.ch } },
      update: {},
      create: {
        machineId:   machines[p.mc],
        channel:     p.ch,
        usl:         p.usl,
        lsl:         p.lsl,
        sampleSize:  5,
        sampleCount: 25,
      },
    });
  }

  // ─── ML 모델 상태 ─────────────────────────────────────
  const mlModels = [
    { modelType: 'AUTOENCODER',  version: 'v1.2.0', trainSamples: 45000, threshold: 0.082, isActive: true },
    { modelType: 'FAILURE_PROB', version: 'v2.1.0', trainSamples: 12000, threshold: 0.70,  isActive: true },
    { modelType: 'RUL',          version: 'v1.0.3', trainSamples:  8500, threshold: null,  isActive: true },
  ];
  for (const m of mlModels) {
    await prisma.mlModelStatus.upsert({
      where: { modelType_isActive: { modelType: m.modelType, isActive: true } },
      update: { trainSamples: m.trainSamples },
      create: { ...m, trainedAt: d(-72), metrics: { loss: 0.0034, val_loss: 0.0041 } },
    });
  }

  // ─── 예측 로그 20건 ───────────────────────────────────
  const predLogData = [
    { mc: 'PRESS-01', ch: 'vibration_x', modelType: 'AUTOENCODER',  score: 0.127, isAnomaly: true,  oh: -6   },
    { mc: 'PRESS-01', ch: 'vibration_y', modelType: 'AUTOENCODER',  score: 0.054, isAnomaly: false, oh: -6   },
    { mc: 'PRESS-01', ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.78,  isAnomaly: true,  oh: -5   },
    { mc: 'PRESS-01', ch: 'ALL',         modelType: 'RUL',          score: 45,    isAnomaly: false, oh: -5   },
    { mc: 'PRESS-02', ch: 'vibration_y', modelType: 'AUTOENCODER',  score: 0.091, isAnomaly: true,  oh: -5   },
    { mc: 'PRESS-02', ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.55,  isAnomaly: false, oh: -4   },
    { mc: 'PRESS-02', ch: 'ALL',         modelType: 'RUL',          score: 120,   isAnomaly: false, oh: -4   },
    { mc: 'PRESS-03', ch: 'vibration_x', modelType: 'AUTOENCODER',  score: 0.203, isAnomaly: true,  oh: -4   },
    { mc: 'PRESS-03', ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.42,  isAnomaly: false, oh: -3   },
    { mc: 'PRESS-03', ch: 'ALL',         modelType: 'RUL',          score: 210,   isAnomaly: false, oh: -3   },
    { mc: 'PRESS-04', ch: 'current',     modelType: 'AUTOENCODER',  score: 0.038, isAnomaly: false, oh: -3   },
    { mc: 'PRESS-04', ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.31,  isAnomaly: false, oh: -2.5 },
    { mc: 'PRESS-04', ch: 'ALL',         modelType: 'RUL',          score: 380,   isAnomaly: false, oh: -2.5 },
    { mc: 'PRESS-05', ch: 'vibration_x', modelType: 'AUTOENCODER',  score: 0.068, isAnomaly: false, oh: -2   },
    { mc: 'PRESS-05', ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.25,  isAnomaly: false, oh: -2   },
    { mc: 'PRESS-06', ch: 'vibration_x', modelType: 'AUTOENCODER',  score: 0.115, isAnomaly: true,  oh: -1.5 },
    { mc: 'PRESS-06', ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.63,  isAnomaly: false, oh: -1.5 },
    { mc: 'WELD-01',  ch: 'temperature',  modelType: 'AUTOENCODER',  score: 0.182, isAnomaly: true,  oh: -1   },
    { mc: 'WELD-01',  ch: 'ALL',         modelType: 'FAILURE_PROB', score: 0.71,  isAnomaly: true,  oh: -1   },
    { mc: 'PRESS-07', ch: 'vibration_x', modelType: 'AUTOENCODER',  score: 0.044, isAnomaly: false, oh: -0.5 },
  ];

  for (const p of predLogData) {
    await prisma.predictionLog.create({
      data: {
        machineId:   machines[p.mc],
        channel:     p.ch,
        modelType:   p.modelType,
        score:       p.score,
        isAnomaly:   p.isAnomaly,
        predictedAt: d(p.oh),
      },
    });
  }

  // ─── 생산 스케줄 20건 ─────────────────────────────────
  const scheduleData = [
    { no: 'SCH-001', mc: 'PRESS-01', pc: 'BKT-A100', qty: 5000, ps: d(-16), pe: d(-8),  status: 'COMPLETED',   priority: 1 },
    { no: 'SCH-002', mc: 'PRESS-02', pc: 'PNL-B200', qty: 3000, ps: d(-14), pe: d(-7),  status: 'COMPLETED',   priority: 2 },
    { no: 'SCH-003', mc: 'PRESS-03', pc: 'CVR-C300', qty: 4000, ps: d(-12), pe: d(-4),  status: 'COMPLETED',   priority: 3 },
    { no: 'SCH-004', mc: 'PRESS-05', pc: 'CLP-D400', qty: 8000, ps: d(-10), pe: d(-2),  status: 'COMPLETED',   priority: 2 },
    { no: 'SCH-005', mc: 'PRESS-06', pc: 'HNG-E500', qty: 6000, ps: d(-8),  pe: d(0),   status: 'COMPLETED',   priority: 3 },
    { no: 'SCH-006', mc: 'PRESS-07', pc: 'BKT-A100', qty: 5000, ps: d(-8),  pe: d(0),   status: 'COMPLETED',   priority: 1 },
    { no: 'SCH-007', mc: 'PRESS-01', pc: 'BKT-A100', qty: 5000, ps: d(-4),  pe: d(4),   status: 'IN_PROGRESS', priority: 1 },
    { no: 'SCH-008', mc: 'PRESS-02', pc: 'CLP-D400', qty: 8000, ps: d(-2),  pe: d(8),   status: 'IN_PROGRESS', priority: 2 },
    { no: 'SCH-009', mc: 'PRESS-05', pc: 'HNG-E500', qty: 6000, ps: d(-1),  pe: d(10),  status: 'IN_PROGRESS', priority: 3 },
    { no: 'SCH-010', mc: 'PRESS-06', pc: 'PNL-B200', qty: 3500, ps: d(-0.5),pe: d(7),   status: 'IN_PROGRESS', priority: 2 },
    { no: 'SCH-011', mc: 'PRESS-04', pc: 'CVR-C300', qty: 4000, ps: d(-6),  pe: d(0),   status: 'ON_HOLD',     priority: 4 },
    { no: 'SCH-012', mc: 'PRESS-03', pc: 'GRL-F600', qty: 2000, ps: d(2),   pe: d(10),  status: 'PENDING',     priority: 3 },
    { no: 'SCH-013', mc: 'PRESS-01', pc: 'PNL-B200', qty: 3500, ps: d(4),   pe: d(12),  status: 'PENDING',     priority: 2 },
    { no: 'SCH-014', mc: 'PRESS-07', pc: 'SHF-G700', qty: 4000, ps: d(6),   pe: d(14),  status: 'PENDING',     priority: 3 },
    { no: 'SCH-015', mc: 'PRESS-02', pc: 'FLG-H800', qty: 3000, ps: d(8),   pe: d(16),  status: 'PENDING',     priority: 4 },
    { no: 'SCH-016', mc: 'PRESS-05', pc: 'BKT-A100', qty: 5000, ps: d(10),  pe: d(18),  status: 'PENDING',     priority: 1 },
    { no: 'SCH-017', mc: 'PRESS-03', pc: 'CLP-D400', qty: 7000, ps: d(12),  pe: d(22),  status: 'PENDING',     priority: 2 },
    { no: 'SCH-018', mc: 'PRESS-06', pc: 'CVR-C300', qty: 4000, ps: d(14),  pe: d(22),  status: 'PENDING',     priority: 3 },
    { no: 'SCH-019', mc: 'WELD-01',  pc: 'ASSY-W100',qty: 2000, ps: d(2),   pe: d(8),   status: 'PENDING',     priority: 5 },
    { no: 'SCH-020', mc: 'BEND-02',  pc: 'BEND-B200',qty: 1500, ps: d(4),   pe: d(10),  status: 'PENDING',     priority: 5 },
  ];

  for (const s of scheduleData) {
    await prisma.productionSchedule.upsert({
      where: { scheduleNo: s.no },
      update: { status: s.status as any },
      create: {
        scheduleNo:   s.no,
        machineId:    machines[s.mc],
        productCode:  s.pc,
        plannedQty:   s.qty,
        plannedStart: s.ps,
        plannedEnd:   s.pe,
        status:       s.status as any,
        priority:     s.priority,
        createdById:  manager1,
      },
    });
  }

  // ─── 센서 데이터 (최근 48h, 2h 간격, 8개 설비) ────────
  console.log('Seeding sensor data...');
  const sensorChannels = [
    { ch: 'vibration_x', base: 8.5,  noise: 3.0 },
    { ch: 'vibration_y', base: 7.2,  noise: 2.5 },
    { ch: 'temperature',  base: 62.0, noise: 8.0 },
    { ch: 'power_kw',    base: 95.0, noise: 20.0 },
    { ch: 'current',     base: 28.0, noise: 5.0  },
  ];
  const sensorMachines = ['PRESS-01', 'PRESS-02', 'PRESS-03', 'PRESS-04', 'PRESS-05', 'PRESS-06', 'WELD-01', 'BEND-02'];

  for (const mc of sensorMachines) {
    for (let h = -48; h <= 0; h += 2) {
      for (const { ch, base, noise } of sensorChannels) {
        const rand = (Math.random() - 0.5) * 2 * noise;
        await prisma.sensorData.create({
          data: {
            machineId: machines[mc],
            channel:   ch,
            value:     parseFloat((base + rand).toFixed(3)),
            time:      d(h),
          },
        });
      }
    }
  }

  console.log('\n✅ Seed completed!');
  console.log(`  생산 라인:   4개`);
  console.log(`  설비:       ${machineData.length}대`);
  console.log(`  공급처:     ${supplierData.length}개`);
  console.log(`  자재:       ${materialData.length}종`);
  console.log(`  사용자:     ${userData.length}명`);
  console.log(`  금형:       ${moldData.length}개`);
  console.log(`  작업 지시:  ${woData.length}건`);
  console.log(`  LOT:        ${lotData.length}개`);
  console.log(`  LOT 이벤트: ${lotEventData.length}건`);
  console.log(`  알람 규칙:  ${alarmRuleData.length}개`);
  console.log(`  알람 이벤트:${alarmEventData.length}건`);
  console.log(`  SPC 파라미터:${spcParamData.length}개`);
  console.log(`  예측 로그:  ${predLogData.length}건`);
  console.log(`  생산 스케줄:${scheduleData.length}건`);
  console.log(`  센서 데이터: ${sensorMachines.length * 25 * sensorChannels.length}건`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
