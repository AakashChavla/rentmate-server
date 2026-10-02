import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { createDatabaseOptions } from './database.options';
import { TransactionRunner } from './transaction-runner';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        ...createDatabaseOptions({
          databaseUrl: config.databaseUrl,
          nodeEnv: config.nodeEnv,
        }),
        retryAttempts: 10,
        retryDelay: 3000,
        autoLoadEntities: true,
      }),
    }),
  ],
  providers: [TransactionRunner],
  exports: [TransactionRunner, TypeOrmModule],
})
export class DatabaseModule {}
