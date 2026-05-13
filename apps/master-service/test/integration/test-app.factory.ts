import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { HttpExceptionFilter } from '@ks-mes/common';
import { PrismaService } from '../../src/db/prisma.service';
import { LotModule } from '../../src/lot/lot.module';
import { MachineModule } from '../../src/machine/machine.module';
import { WorkOrderModule } from '../../src/work-order/work-order.module';
import { DbModule } from '../../src/db/db.module';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ DATABASE_URL: process.env.TEST_DATABASE_URL })],
      }),
      PassportModule,
      DbModule,
      LotModule,
      MachineModule,
      WorkOrderModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.init();

  const prisma = moduleRef.get(PrismaService);

  return { app, prisma };
}

/** Wipes all tables between tests via Prisma's deleteMany in dependency order. */
export async function resetDatabase(prisma: PrismaService) {
  await prisma.$transaction([
    prisma.lotEvent.deleteMany(),
    prisma.workOrder.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.user.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.material.deleteMany(),
    prisma.productionLine.deleteMany(),
  ]);
}

/** Create a minimal user for FK references. */
export async function seedUser(prisma: PrismaService, overrides: Partial<{ id: string; name: string; role: string }> = {}) {
  return prisma.user.create({
    data: {
      id: overrides.id ?? `user-${Date.now()}`,
      name: overrides.name ?? 'Test User',
      email: `test-${Date.now()}@ks-mes.local`,
      role: (overrides.role ?? 'ADMIN') as never,
    },
  });
}
