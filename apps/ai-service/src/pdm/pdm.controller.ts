import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PdmService } from './pdm.service';
import { QueryPredictionsDto } from './dto/query-predictions.dto';

@Controller('pdm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PdmController {
  constructor(private readonly pdmService: PdmService) {}

  @Get('summary')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getSummary(@Query('machineId') machineId: string) {
    const data = await this.pdmService.getPdmSummary(machineId);
    return { data };
  }

  @Get('predictions')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getPredictions(@Query() query: QueryPredictionsDto) {
    const data = await this.pdmService.getPredictions(query.machineId, query.modelType, query.limit);
    return { data };
  }

  @Get('model-status')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getModelStatus() {
    const data = await this.pdmService.getModelStatus();
    return { data };
  }
}
