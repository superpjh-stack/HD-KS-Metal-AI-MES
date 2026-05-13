import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { LotModule } from './lot/lot.module';
import { MachineModule } from './machine/machine.module';
import { WorkOrderModule } from './work-order/work-order.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PassportModule,
    DbModule,
    AuthModule,
    LotModule,
    MachineModule,
    WorkOrderModule,
  ],
})
export class AppModule {}
