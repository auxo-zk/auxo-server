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

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB, {
            connectTimeoutMS: 10000000,
            socketTimeoutMS: 10000000,
        }),
        MongooseModule.forFeature([]),
        MinaContractsModule,
        HttpModule,
        ApisModule,
    ],
    controllers: [AppController, IpfsController, ObjectStorageController],
    providers: [AppService, Ipfs, ObjectStorageService],
})
export class AppModule {}
