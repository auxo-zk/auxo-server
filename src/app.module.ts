import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaModule } from './mina/mina.module';
import { HttpModule } from '@nestjs/axios';

import { Committee, CommitteeSchema } from './schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from './schemas/committee-action.schema';
import { Key, KeySchema } from './schemas/key.schema';

import { AppService } from './app.service';

import { AppController } from './app.controller';
import { Ipfs } from './ipfs/ipfs';
import { IpfsController } from './ipfs/ipfs.controller';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: Key.name, schema: KeySchema },
        ]),
        MinaModule,
        HttpModule,
    ],
    controllers: [AppController, IpfsController],
    providers: [AppService, Ipfs],
})
export class AppModule {}
