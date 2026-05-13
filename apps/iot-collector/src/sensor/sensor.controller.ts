import {
  Controller, Get, Param, Query, UseGuards, Sse, MessageEvent,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { SensorService } from './sensor.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoryQueryDto } from './dto/history-query.dto';

@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorController {
  constructor(
    private readonly sensorService: SensorService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  /** 전 설비 최신 센서값 — 대시보드 KPI 카드용 */
  @Get('latest')
  async getLatest() {
    const data = await this.sensorService.getLatest();
    return { data };
  }

  /** 기간별 센서 이력 — 트렌드 분석용 */
  @Get(':machineId/history')
  async getHistory(@Param('machineId') machineId: string, @Query() query: HistoryQueryDto) {
    const rows = await this.sensorService.getHistory(
      machineId,
      new Date(query.from),
      new Date(query.to),
      query.channel,
    );
    return { data: rows };
  }

  /**
   * SSE 실시간 스트림 — 대시보드 SensorSparkline 컴포넌트용
   * Redis 채널 `realtime:{machineId}` 구독 → EventSource 이벤트 발행
   */
  @Get(':machineId/realtime')
  @Sse()
  realtimeStream(@Param('machineId') machineId: string): Observable<MessageEvent> {
    return this.redisPubSub.subscribe(`realtime:${machineId}`).pipe(
      map((data) => ({ data } as MessageEvent)),
    );
  }
}
