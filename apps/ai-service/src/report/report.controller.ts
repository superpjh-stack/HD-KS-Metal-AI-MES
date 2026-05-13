import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportService } from './report.service';
import { QueryReportGenerateDto } from './dto/query-report-generate.dto';

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /** RPT-05: Report history (last 30) */
  @Get()
  async listReports() {
    return this.reportService.listReports(30);
  }

  /** RPT-04: On-demand PDF download — MANAGER role required */
  @Get('generate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async generateReport(
    @Query(new ValidationPipe({ transform: true })) query: QueryReportGenerateDto,
    @Res() res: Response,
    @Request() req: { user?: { sub?: string } },
  ) {
    const from = new Date(query.from);
    const to = new Date(query.to + 'T23:59:59.999Z');
    const userId = req.user?.sub;

    const diffDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    const reportType =
      diffDays <= 1 ? 'daily'
      : diffDays <= 7 ? 'weekly'
      : diffDays <= 31 ? 'monthly'
      : 'custom';

    const buffer = await this.reportService.generatePdf(from, to, reportType as any, userId);

    const filename = `report-${query.from.slice(0, 10)}-${to.toISOString().slice(0, 10)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
