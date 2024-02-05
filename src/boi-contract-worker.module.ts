import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { BullModule } from '@nestjs/bull';
import { BoiContractCronTasksService } from './cron-tasks/boi-contract-cron-tasks.service';
import { BoiContractServicesConsumer } from './consumers/boi-contract-services.consumer';

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
            name: 'boi-contract-services',
        }),
    ],
    providers: [BoiContractCronTasksService, BoiContractServicesConsumer],
})
export class BoiContractWorkerModule {}
