import { Module } from '@nestjs/common';
import { MinaContractsModule } from 'src/mina-contracts/mina-contracts.module';
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
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { Project, ProjectSchema } from 'src/schemas/project.schema';
import { BuildersService } from './builders/builders.service';
import { BuildersController } from './builders/builders.controller';
import { Builder, BuilderSchema } from 'src/schemas/builder.schema';
import { Draft, DraftSchema } from 'src/schemas/draft.schema';
import { OrganizersController } from './organizers/organizers.controller';
import { OrganizersService } from './organizers/organizers.service';
import { Organizer, OrganizerSchema } from 'src/schemas/organizer.schema';
import { ObjectStorageService } from 'src/object-storage/object-storage.service';
import { Campaign, CampaignSchema } from 'src/schemas/campaign.schema';
import { CampaignsService } from './campaigns/campaigns.service';
import { CampaignsController } from './campaigns/campaigns.controller';

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
            { name: Project.name, schema: ProjectSchema },
            { name: Builder.name, schema: BuilderSchema },
            { name: Draft.name, schema: DraftSchema },
            { name: Organizer.name, schema: OrganizerSchema },
            { name: Campaign.name, schema: CampaignSchema },
        ]),
        HttpModule,
        CacheModule.register(),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '10d' },
        }),
    ],
    controllers: [
        CommitteesController,
        StoragesController,
        AuthController,
        ProjectsController,
        BuildersController,
        OrganizersController,
        CampaignsController,
    ],
    providers: [
        Ipfs,
        CommitteesService,
        StoragesService,
        AuthService,
        ProjectsService,
        BuildersService,
        OrganizersService,
        ObjectStorageService,
        CampaignsService,
    ],
})
export class ApisModule {}
