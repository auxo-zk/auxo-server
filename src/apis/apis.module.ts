import { Module } from '@nestjs/common';
import { MinaContractsModule } from 'src/mina-contracts/mina-contracts.module';
import { CommitteesController } from './committees/committees.controller';
import { CommitteesService } from './committees/committees.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import { Key, KeySchema } from 'src/schemas/key.schema';
import { DkgRequest, DkgRequestSchema } from 'src/schemas/request.schema';
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
import { ProjectDraft, ProjectDraftSchema } from 'src/schemas/draft.schema';
import { OrganizersController } from './organizers/organizers.controller';
import { OrganizersService } from './organizers/organizers.service';
import { Organizer, OrganizerSchema } from 'src/schemas/organizer.schema';
import { ObjectStorageService } from 'src/object-storage/object-storage.service';
import { Campaign, CampaignSchema } from 'src/schemas/campaign.schema';
import { CampaignsService } from './campaigns/campaigns.service';
import { CampaignsController } from './campaigns/campaigns.controller';
import {
    Participation,
    ParticipationSchema,
} from 'src/schemas/participation.schema';
import {
    FundingResult,
    FundingResultSchema,
} from 'src/schemas/funding-result.schema';

@Module({
    imports: [
        MinaContractsModule,
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: Key.name, schema: KeySchema },
            { name: DkgRequest.name, schema: DkgRequestSchema },
            { name: Project.name, schema: ProjectSchema },
            { name: Builder.name, schema: BuilderSchema },
            { name: ProjectDraft.name, schema: ProjectDraftSchema },
            { name: Organizer.name, schema: OrganizerSchema },
            { name: Campaign.name, schema: CampaignSchema },
            { name: Participation.name, schema: ParticipationSchema },
            { name: FundingResult.name, schema: FundingResultSchema },
        ]),
        HttpModule,
        CacheModule.register(),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '100d' },
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
