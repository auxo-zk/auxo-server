import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { HttpModule } from '@nestjs/axios';

import { AppService } from './app.service';

import { AppController } from './app.controller';
import { Ipfs } from './ipfs/ipfs';
import { IpfsController } from './ipfs/ipfs.controller';
import { ApisModule } from './apis/apis.module';
import { ObjectStorageService } from './object-storage/object-storage.service';
import { ObjectStorageController } from './object-storage/object-storage.controller';
import { MainCronTasksService } from './cron-tasks/main-cron-tasks.service';
import { BullModule } from '@nestjs/bull';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB, {
            connectTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        }),
        MongooseModule.forFeature([]),
        MinaContractsModule,
        ApisModule,
        HttpModule,
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
    controllers: [AppController, IpfsController, ObjectStorageController],
    providers: [AppService, Ipfs, ObjectStorageService, MainCronTasksService],
    exports: [AppService],
})
export class AppModule {}
