import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaModule } from './mina/mina.module';

import { Committee, CommitteeSchema } from './schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from './schemas/committee-action.schema';

import { AppService } from './app.service';

import { AppController } from './app.controller';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
        ]),
        MinaModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
