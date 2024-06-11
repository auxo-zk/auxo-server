import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { DkgContractCronTasksService } from './cron-tasks/dkg-contract-cron-tasks.service';
import { BullModule } from '@nestjs/bull';
import { DkgContractServicesConsumer } from './consumers/dkg-contract-services.consumer';

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
            name: 'dkg-contract-services',
        }),
    ],
    providers: [DkgContractCronTasksService, DkgContractServicesConsumer],
})
export class DkgContractWorkerModule {}
