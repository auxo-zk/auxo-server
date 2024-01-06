import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina.module';
import { HttpModule } from '@nestjs/axios';

// import { Committee, CommitteeSchema } from './schemas/committee.schema';
// import {
//     CommitteeAction,
//     CommitteeActionSchema,
// } from './schemas/committee-action.schema';
// import { Key, KeySchema } from './schemas/key.schema';

import { AppService } from './app.service';

import { AppController } from './app.controller';
import { Ipfs } from './ipfs/ipfs';
import { IpfsController } from './ipfs/ipfs.controller';
import { ApisModule } from './apis/apis.module';

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
    controllers: [AppController, IpfsController],
    providers: [AppService, Ipfs],
})
export class AppModule {}
