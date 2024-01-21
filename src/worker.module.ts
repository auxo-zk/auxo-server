import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { CronTasksService } from './cron-tasks/cron-tasks.service';
import { BullModule } from '@nestjs/bull';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB, {
            connectTimeoutMS: 10000000,
            socketTimeoutMS: 10000000,
        }),
        MongooseModule.forFeature([]),
        MinaContractsModule,
        BullModule.forRootAsync({
            useFactory: () => ({
                redis: {
                    host: 'localhost',
                    port: 6379,
                },
            }),
        }),
        BullModule.registerQueue({
            name: 'contract-services',
        }),
    ],
    providers: [CronTasksService],
})
export class WorkerModule {}
