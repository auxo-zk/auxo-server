import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina.module';
import { HttpModule } from '@nestjs/axios';

import { AppService } from './app.service';

import { AppController } from './app.controller';
import { Ipfs } from './ipfs/ipfs';
import { IpfsController } from './ipfs/ipfs.controller';
import { ApisModule } from './apis/apis.module';
import { MinIoService } from './min-io/min-io.service';
import { MinIoController } from './min-io/min-io.controller';

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
    controllers: [AppController, IpfsController, MinIoController],
    providers: [AppService, Ipfs, MinIoService],
})
export class AppModule {}
