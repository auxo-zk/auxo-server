import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { WorkerCronTasksService } from './cron-tasks/worker-cron-tasks.service';
import { BullModule } from '@nestjs/bull';
import { ContractServicesConsumer } from './consumers/contract-services.consumer';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB, {
            connectTimeoutMS: 10000,
            socketTimeoutMS: 10000,
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
    providers: [WorkerCronTasksService, ContractServicesConsumer],
})
export class WorkerModule {}