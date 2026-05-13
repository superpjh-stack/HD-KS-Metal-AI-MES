import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../db/prisma.service';
import { StatsService, ReportData } from '../stats/stats.service';
import * as PDFDocument from 'pdfkit';

const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  async listReports(limit = 30) {
    const records = await this.prisma.reportRecord.findMany({
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
    return { data: records, total: records.length };
  }

  async generatePdf(
    from: Date,
    to: Date,
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom',
    generatedBy?: string,
  ): Promise<Buffer> {
    const data = await this.stats.getReport(from, to);

    await this.prisma.reportRecord.create({
      data: { reportType, from, to, generatedBy: generatedBy ?? null, status: 'completed' },
    });

    return this.buildPdf(data, from, to);
  }

  private buildPdf(data: ReportData, from: Date, to: Date): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = doc.page.width - 100;
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      // Cover
      doc.moveDown(4);
      doc.font(FONT_REGULAR).fontSize(10).fillColor('#6b7280').text('AI-MES 제조 실행 시스템 | HD-KS Metal', { align: 'center' });
      doc.moveDown(0.5);
      doc.font(FONT_BOLD).fontSize(22).fillColor('#111827').text('생산 현황 분석 리포트', { align: 'center' });
      doc.moveDown(0.5);
      doc.font(FONT_REGULAR).fontSize(12).fillColor('#374151').text(`${fromStr} ~ ${toStr}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#9ca3af').text(`생성일: ${new Date().toLocaleDateString('ko-KR')}  |  (주)광성정밀`, { align: 'center' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(1.5);

      // Section 1: KPI Table
      this.sectionTitle(doc, '1. 핵심 지표 요약 (KPI)');
      const kpis = [
        ['총 알람', String(data.alarms.total)],
        ['CRITICAL 알람', String(data.alarms.critical)],
        ['AI 이상 감지', `${data.pdm.anomalyCount}건`],
        ['SPC 이탈', `${data.spc.totalViolations}건`],
        ['고위험 설비', `${data.pdm.highRiskMachines}대`],
        ['평균 잔여수명', data.pdm.avgRulHours != null ? `${data.pdm.avgRulHours.toFixed(0)}h` : 'N/A'],
      ];
      this.drawTable(doc, ['지표', '값'], kpis, PAGE_W);
      doc.moveDown(1);

      // Section 2: OEE Bar Chart
      this.sectionTitle(doc, '2. 설비별 OEE 현황');
      const oeeData = data.machines.filter((m) => m.oee != null);
      if (oeeData.length === 0) {
        doc.font(FONT_REGULAR).fontSize(10).fillColor('#6b7280').text('OEE 데이터 없음').moveDown(0.5);
      } else {
        this.drawBarChart(doc, oeeData.map((m) => ({ label: m.machineCode, value: m.oee! * 100 })), PAGE_W, 100, '%');
      }
      doc.moveDown(1);

      // Section 3: Alarm Distribution
      this.sectionTitle(doc, '3. 알람 분포');
      this.drawTable(doc, ['심각도', '건수', '비율'], [
        ['CRITICAL', String(data.alarms.critical), pct(data.alarms.critical, data.alarms.total)],
        ['WARNING', String(data.alarms.warning), pct(data.alarms.warning, data.alarms.total)],
        ['INFO', String(data.alarms.info), pct(data.alarms.info, data.alarms.total)],
      ], PAGE_W);
      doc.moveDown(1);

      // Section 4: PDM Risk Matrix
      this.sectionTitle(doc, '4. 예측정비 (PDM) 위험 매트릭스');
      const pdmRows = data.machines.map((m) => [
        m.machineCode,
        m.name,
        m.pdmRisk === 'HIGH' ? '높음' : m.pdmRisk === 'LOW' ? '낮음' : '정상',
        String(m.alarmCount),
      ]);
      this.drawTable(doc, ['설비코드', '설비명', '고장위험', '알람수'], pdmRows, PAGE_W);
      doc.moveDown(1);

      // Section 5: SPC
      this.sectionTitle(doc, '5. SPC 품질 분석');
      doc.font(FONT_REGULAR).fontSize(10).fillColor('#374151')
         .text(`Western Electric 규칙 위반: 총 ${data.spc.totalViolations}건`);
      if (data.spc.topMachines.length > 0) {
        doc.moveDown(0.3);
        this.drawTable(doc, ['설비', '위반 건수'], data.spc.topMachines.map((m) => [m.machineCode, String(m.count)]), PAGE_W);
      }

      // Footer
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.3);
      doc.font(FONT_REGULAR).fontSize(9).fillColor('#9ca3af')
         .text(`HD-KS Metal AI-MES  ·  (주)광성정밀  ·  ${new Date().getFullYear()}`, { align: 'center' });

      doc.end();
    });
  }

  private sectionTitle(doc: any, title: string) {
    doc.font(FONT_BOLD).fontSize(13).fillColor('#1e40af').text(title);
    doc.moveDown(0.4);
  }

  private drawTable(doc: any, headers: string[], rows: string[][], width: number) {
    const colW = width / headers.length;
    const startX = 50;
    let y = doc.y;

    doc.font(FONT_BOLD).fontSize(9).fillColor('#374151');
    headers.forEach((h, i) => {
      doc.text(h, startX + i * colW, y, { width: colW - 4, align: i === 0 ? 'left' : 'right' });
    });
    y += 16;
    doc.moveTo(startX, y).lineTo(startX + width, y).strokeColor('#d1d5db').lineWidth(0.5).stroke();
    y += 4;

    doc.font(FONT_REGULAR).fontSize(9).fillColor('#374151');
    for (const row of rows) {
      row.forEach((cell, i) => {
        doc.text(cell, startX + i * colW, y, { width: colW - 4, align: i === 0 ? 'left' : 'right' });
      });
      y += 16;
    }
    doc.y = y + 2;
  }

  private drawBarChart(doc: any, items: Array<{ label: string; value: number }>, width: number, maxValue: number, unit: string) {
    const startX = 50;
    const barMaxW = width - 120;
    let y = doc.y;

    for (const item of items) {
      const barW = Math.max((item.value / maxValue) * barMaxW, 2);
      const color = item.value >= 85 ? '#16a34a' : item.value >= 65 ? '#d97706' : '#dc2626';
      doc.font(FONT_REGULAR).fontSize(9).fillColor('#374151').text(item.label, startX, y + 3, { width: 70 });
      doc.rect(startX + 75, y, barW, 14).fillColor(color).fill();
      doc.font(FONT_BOLD).fontSize(9).fillColor('#111827').text(`${item.value.toFixed(1)}${unit}`, startX + 75 + barW + 4, y + 3);
      y += 20;
    }
    doc.y = y + 4;
  }

  @Cron('0 6 * * *', { timeZone: 'Asia/Seoul', name: 'daily-report' })
  async runDailyReport() {
    this.logger.log('Running scheduled daily report');
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    try {
      await this.generatePdf(from, to, 'daily');
    } catch (err) {
      this.logger.error('Daily report failed', err);
      await this.prisma.reportRecord.create({ data: { reportType: 'daily', from, to, status: 'failed' } });
    }
  }

  @Cron('0 7 * * 1', { timeZone: 'Asia/Seoul', name: 'weekly-report' })
  async runWeeklyReport() {
    this.logger.log('Running scheduled weekly report');
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() - 1);
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    try {
      await this.generatePdf(from, to, 'weekly');
    } catch (err) {
      this.logger.error('Weekly report failed', err);
      await this.prisma.reportRecord.create({ data: { reportType: 'weekly', from, to, status: 'failed' } });
    }
  }

  @Cron('0 8 1 * *', { timeZone: 'Asia/Seoul', name: 'monthly-report' })
  async runMonthlyReport() {
    this.logger.log('Running scheduled monthly report');
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    try {
      await this.generatePdf(from, to, 'monthly');
    } catch (err) {
      this.logger.error('Monthly report failed', err);
      await this.prisma.reportRecord.create({ data: { reportType: 'monthly', from, to, status: 'failed' } });
    }
  }
}

function pct(part: number, total: number): string {
  if (total === 0) return '—';
  return `${((part / total) * 100).toFixed(1)}%`;
}
