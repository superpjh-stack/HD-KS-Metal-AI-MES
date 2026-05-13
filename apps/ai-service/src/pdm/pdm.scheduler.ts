import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../db/prisma.service';
import { PdmService } from './pdm.service';

@Injectable()
export class PdmScheduler {
  private readonly log = new Logger(PdmScheduler.name);

  private readonly CHANNELS = [
    'vibration_x', 'vibration_y', 'temperature', 'power_kw', 'current',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdmService: PdmService,
  ) {}

  @Cron('0 */5 * * * *')
  async runPdmBatch() {
    const machines = await this.prisma.machine.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, machineCode: true },
    });

    for (const machine of machines) {
      try {
        await this.pdmService.runFailurePrediction(machine.id, machine.machineCode);

        for (const channel of this.CHANNELS) {
          await this.pdmService.runAnomalyDetection(machine.id, machine.machineCode, channel);
          await this.pdmService.runRulPrediction(machine.id, machine.machineCode, channel);
        }
      } catch (err) {
        this.log.warn(`PDM 배치 오류 [${machine.machineCode}]: ${(err as Error).message}`);
      }
    }
  }
}
