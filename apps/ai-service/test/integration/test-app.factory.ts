import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { HttpExceptionFilter } from '@ks-mes/common';
import { PrismaService } from '../../src/db/prisma.service';
import { DbModule } from '../../src/db/db.module';
import { AlarmModule } from '../../src/alarm/alarm.module';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import { TS_POOL } from '../../src/timescale/timescale.module';
import { REDIS_PUB, REDIS_SUB } from '../../src/shared/redis.module';

// TimescaleDB + Redis mock (통합 테스트는 Postgres 알람 CRUD에 집중)
const mockPool  = { query: jest.fn().mockResolvedValue({ rows: [] }) };
const mockRedis = { publish: jest.fn(), subscribe: jest.fn(), on: jest.fn(), quit: jest.fn() };

export interface TestApp {
  app:    INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ DATABASE_URL: process.env.TEST_DATABASE_URL })],
      }),
      ScheduleModule.forRoot(),
      PassportModule,
      DbModule,
      AlarmModule,
    ],
  })
    .overrideProvider(TS_POOL).useValue(mockPool)
    .overrideProvider(REDIS_PUB).useValue(mockRedis)
    .overrideProvider(REDIS_SUB).useValue(mockRedis)
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.init();

  const prisma = moduleRef.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.$transaction([
    prisma.alarmEvent.deleteMany(),
    prisma.alarmRule.deleteMany(),
    prisma.spcParameter.deleteMany(),
    prisma.machine.deleteMany(),
  ]);
}

export async function seedMachine(
  prisma: PrismaService,
  overrides: Partial<{ id: string; machineCode: string }> = {},
) {
  return prisma.machine.create({
    data: {
      id:          overrides.id ?? `m-${Date.now()}`,
      machineCode: overrides.machineCode ?? `PRESS-T${Date.now()}`,
      name:        '테스트 프레스',
      machineType: 'PRESS',
    },
  });
}
