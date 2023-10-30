import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { MongooseModule } from '@nestjs/mongoose';
import { Committee, CommitteeSchema } from './schemas/committee.schema';
import { MinaModule } from './mina/mina.module';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
        ]),
        MinaModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
