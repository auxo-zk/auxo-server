import { Module } from '@nestjs/common';
import { MinaContractsModule } from 'src/mina-contracts/mina.module';
import { CommitteesController } from './committees/committees.controller';
import { CommitteesService } from './committees/committees.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import { Key, KeySchema } from 'src/schemas/key.schema';
import { Round1, Round1Schema } from 'src/schemas/round-1.schema';
import { Round2, Round2Schema } from 'src/schemas/round-2.schema';
import { DkgRequest, DkgRequestSchema } from 'src/schemas/request.schema';
import { DkgResponse, DkgResponseSchema } from 'src/schemas/response.schema';
import { Ipfs } from 'src/ipfs/ipfs';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { StoragesService } from './storages/storages.service';
import { StoragesController } from './storages/storages.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/constants';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';

@Module({
    imports: [
        MinaContractsModule,
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: Key.name, schema: KeySchema },
            { name: Round1.name, schema: Round1Schema },
            { name: Round2.name, schema: Round2Schema },
            { name: DkgRequest.name, schema: DkgRequestSchema },
            { name: DkgResponse.name, schema: DkgResponseSchema },
        ]),
        HttpModule,
        CacheModule.register(),
        JwtModule.register({
            global: true,
            secret: jwtConstants.secret,
            signOptions: { expiresIn: '10d' },
        }),
    ],
    controllers: [CommitteesController, StoragesController, AuthController],
    providers: [Ipfs, CommitteesService, StoragesService, AuthService],
})
export class ApisModule {}
