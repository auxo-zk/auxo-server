import {
    Constants,
    ResultStorage,
    ResultVector,
    ScalarVectorStorage,
    ZkApp,
} from '@auxo-dev/dkg';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Field, PublicKey, Scalar, UInt8 } from 'o1js';
import { ZkAppIndex } from 'src/constants';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from 'src/mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from 'src/mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';
import { Committee } from 'src/schemas/committee.schema';
import { Task } from 'src/schemas/task.schema';
import { DkgRequest } from 'src/schemas/request.schema';
import { ProjectContractService } from 'src/mina-contracts/project-contract/project-contract.service';
import { CampaignContractService } from 'src/mina-contracts/campaign-contract/campaign-contract.service';
import { Campaign } from 'src/schemas/campaign.schema';
import { ParticipationContractService } from 'src/mina-contracts/participation-contract/participation-contract.service';
import { Key } from 'src/schemas/key.schema';
import { FundingContractService } from 'src/mina-contracts/funding-contract/funding-contract.service';
import { Funding } from 'src/schemas/funding.schema';
import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';
import { Participation } from 'src/schemas/participation.schema';
import { Project } from 'src/schemas/project.schema';
import { CustomScalar } from '@auxo-dev/auxo-libs';

@Injectable()
export class MethodInputsService {
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly requesterContractService: RequesterContractsService,
        private readonly projectContractService: ProjectContractService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryManagerContractService: TreasuryManagerContractService,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
    ) {}

    getDkgContractGenerateKey(committeeId: number, memberId: number) {
        try {
            const memberWitness =
                this.committeeContractService.memberStorage.getWitness(
                    Field(committeeId),
                    Field(memberId),
                );
            const committeeRef =
                this.dkgContractService.dkg.zkAppStorage.getZkAppRef(
                    ZkAppIndex.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.dkg.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.dkg.zkAppStorage.getZkAppRef(
                    ZkAppIndex.DKG,
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
            return {
                memberWitness,
                committeeRef,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRound1ContractContribute(committeeId: number, memberId: number) {
        try {
            const memberWitness =
                this.committeeContractService.memberStorage.getWitness(
                    Field(committeeId),
                    Field(memberId),
                );
            const committeeRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );
            return {
                memberWitness,
                committeeRef,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRound1ContractFinalize(committeeId: number, keyId: number) {
        try {
            const settingWitness =
                this.committeeContractService.settingStorage.getWitness(
                    this.committeeContractService.settingStorage.calculateLevel1Index(
                        Field(committeeId),
                    ),
                );
            const keyStatusWitness =
                this.dkgContractService.dkg.keyStatusStorage.getWitness(
                    this.dkgContractService.dkg.keyStatusStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                );
            const committeeRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const dkgRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.DKG,
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );

            return {
                settingWitness,
                keyStatusWitness,
                committeeRef,
                dkgRef,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRound2ContractContribute(
        committeeId: number,
        keyId: number,
        memberId: number,
    ) {
        try {
            const memberWitness =
                this.committeeContractService.memberStorage.getWitness(
                    Field(committeeId),
                    Field(memberId),
                );
            const publicKeysWitness =
                this.dkgContractService.round1.publicKeyStorage.getLevel1Witness(
                    this.dkgContractService.round1.publicKeyStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                );
            const committeeRef =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppIndex.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const round1Ref =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND2,
                    PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
                );
            return {
                memberWitness,
                publicKeysWitness,
                committeeRef,
                round1Ref,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRound2ContractFinalize(committeeId: number, keyId: number) {
        try {
            const encryptionWitness =
                this.dkgContractService.round2.encryptionStorage.getLevel1Witness(
                    this.dkgContractService.round2.encryptionStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                );
            const settingWitness =
                this.committeeContractService.settingStorage.getWitness(
                    this.committeeContractService.settingStorage.calculateLevel1Index(
                        Field(committeeId),
                    ),
                );
            const keyStatusWitness =
                this.dkgContractService.dkg.keyStatusStorage.getWitness(
                    this.dkgContractService.dkg.keyStatusStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                );
            const committeeRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const dkgRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.DKG,
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );

            return {
                encryptionWitness,
                settingWitness,
                keyStatusWitness,
                committeeRef,
                dkgRef,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getResponseContractContribute(
        committeeId: number,
        memberId: number,
        keyId: number,
        requestId: number,
    ) {
        try {
            const request = await this.dkgRequestModel.findOne({
                requestId: requestId,
            });
            const task = await this.taskModel.findOne({ task: request.task });
            const committee = await this.committeeModel.findOne({
                committeeId: committeeId,
            });
            const accumulationRootM = this.requesterContractService
                .storage(task.requester)
                .groupVectorStorageMapping[task.taskId].M.root.toString();
            const accumulationRootR = this.requesterContractService
                .storage(task.requester)
                .groupVectorStorageMapping[task.taskId].R.root.toString();
            const accumulationWitnessesR = [];
            for (
                let i = 0;
                i < Constants.ENCRYPTION_LIMITS.FULL_DIMENSION;
                i++
            ) {
                accumulationWitnessesR.push(
                    this.requesterContractService
                        .storage(task.requester)
                        .groupVectorStorageMapping[
                            task.taskId
                        ].R.getWitness(Field(i))
                        .toJSON(),
                );
            }
            const memberWitness =
                this.committeeContractService.memberStorage.getWitness(
                    Field(committeeId),
                    Field(memberId),
                );
            const publicKeyWitness =
                this.dkgContractService.round1.publicKeyStorage.getWitness(
                    this.dkgContractService.round1.publicKeyStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                    this.dkgContractService.round1.publicKeyStorage.calculateLevel2Index(
                        Field(memberId),
                    ),
                );

            const encryptionWitness =
                this.dkgContractService.round2.encryptionStorage.getWitness(
                    this.dkgContractService.round2.encryptionStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                    this.dkgContractService.round2.encryptionStorage.calculateLevel2Index(
                        Field(memberId),
                    ),
                );
            const accumulationWitness =
                this.dkgUsageContractsService.dkgRequest.accumulationStorage.getWitness(
                    this.dkgUsageContractsService.dkgRequest.accumulationStorage.calculateLevel1Index(
                        Field(requestId),
                    ),
                );

            const committeeRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppIndex.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const round1Ref =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );
            const round2Ref =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROUND2,
                    PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
                );
            const requestRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppIndex.REQUEST,
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
            const rollupRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppIndex.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppIndex.RESPONSE,
                    PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
                );

            return {
                accumulationRootM,
                accumulationRootR,
                accumulationWitnessesR,
                memberWitness,
                publicKeyWitness,
                encryptionWitness,
                accumulationWitness,
                committeeRef,
                round1Ref,
                round2Ref,
                requestRef,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getRequesterContractCreateTask(requesterAddress: string) {
        try {
            const taskManagerAddress =
                this.requesterContractService.getTaskManager(requesterAddress);
            const taskManagerRef = this.requesterContractService
                .storage(requesterAddress)
                .zkAppStorage.getZkAppRef(
                    ZkApp.Requester.RequesterAddressBook.TASK_MANAGER,
                    PublicKey.fromBase58(taskManagerAddress),
                );
            return { taskManagerRef };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getRequesterContractSubmitEncryption(
        requesterAddress: string,
        taskId: number,
    ) {
        try {
            const task = await this.taskModel.findOne({
                requester: requesterAddress,
                taskId: taskId,
            });
            const keyWitness =
                this.dkgContractService.dkg.keyStorage.getLevel1Witness(
                    Field(task.keyIndex),
                );
            const keyIndexWitness = this.requesterContractService
                .storage(requesterAddress)
                .keyIndexStorage.getLevel1Witness(Field(taskId));
            const submissionAddress =
                this.requesterContractService.getSubmission(requesterAddress);
            const submissionRef = this.requesterContractService
                .storage(requesterAddress)
                .zkAppStorage.getZkAppRef(
                    ZkApp.Requester.RequesterAddressBook.SUBMISSION,
                    PublicKey.fromBase58(submissionAddress),
                );
            const dkgRef = this.requesterContractService
                .storage(requesterAddress)
                .zkAppStorage.getZkAppRef(
                    ZkApp.Requester.RequesterAddressBook.DKG,
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
            return {
                keyWitness,
                keyIndexWitness,
                submissionRef,
                dkgRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getRequesterContractFinalize(
        requesterAddress: string,
        taskId: number,
    ) {
        try {
            const task = await this.taskModel.findOne({
                requester: requesterAddress,
                taskId: taskId,
            });
            const accumulationRootR = this.requesterContractService
                .storage(requesterAddress)
                .groupVectorStorageMapping[taskId].R.root.toString();
            const accumulationRootM = this.requesterContractService
                .storage(requesterAddress)
                .groupVectorStorageMapping[taskId].M.root.toString();
            const keyIndexWitness = this.requesterContractService
                .storage(requesterAddress)
                .keyIndexStorage.getLevel1Witness(Field(taskId));
            const accumulationWitness = this.requesterContractService
                .storage(requesterAddress)
                .accumulationStorage.getLevel1Witness(Field(taskId));
            const requestRef = this.requesterContractService
                .storage(requesterAddress)
                .zkAppStorage.getZkAppRef(
                    ZkApp.Requester.RequesterAddressBook.REQUEST,
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
            return {
                accumulationRootR,
                accumulationRootM,
                keyIndexWitness,
                accumulationWitness,
                requestRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getProjectContractUpdateProject(projectId: number) {
        try {
            const memberWitnessLevel1 =
                this.projectContractService.memberStorage.getLevel1Witness(
                    Field(projectId),
                );
            const memberWitnessLevel2 =
                this.projectContractService.memberStorage.getLevel2Witness(
                    Field(projectId),
                    Field(0),
                );
            return {
                memberWitnessLevel1,
                memberWitnessLevel2,
            };
        } catch (err) {}
    }

    getCampaignContractCreateCampaign(committeeId: number, keyId: number) {
        try {
            const keyStatusWitness =
                this.dkgContractService.dkg.keyStatusStorage.getLevel1Witness(
                    this.dkgContractService.dkg.keyStatusStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                );
            const campaignContractWitness = this.requesterContractService
                .storage(process.env.FUNDING_REQUESTER_ADDRESS as string)
                .zkAppStorage.getWitness(
                    Field(ZkApp.Requester.RequesterAddressBook.TASK_MANAGER),
                );
            const dkgContractRef =
                this.campaignContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.DKG,
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
            const requesterContractRef =
                this.campaignContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.FUNDING_REQUESTER,
                    PublicKey.fromBase58(
                        process.env.FUNDING_REQUESTER_ADDRESS as string,
                    ),
                );
            return {
                keyStatusWitness,
                campaignContractWitness,
                dkgContractRef,
                requesterContractRef,
            };
        } catch (err) {
            console.log(err);
            throw new BadRequestException(err);
        }
    }

    async getParticipationContractParticipateCampaign(
        campaignId: number,
        projectId: number,
    ) {
        try {
            const campaign = await this.campaignModel.findOne({
                campaignId: campaignId,
            });
            const timeline = campaign.timeline;
            const timelineWitness =
                this.campaignContractService.timelineStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const memberWitnessLevel1 =
                this.projectContractService.memberStorage.getLevel1Witness(
                    Field(projectId),
                );
            const memberWitnessLevel2 =
                this.projectContractService.memberStorage.getLevel2Witness(
                    Field(projectId),
                    Field(0),
                );
            const projectIndexWitness =
                this.participationContractService.projectIndexStorage.getLevel1Witness(
                    this.participationContractService.projectIndexStorage.calculateLevel1Index(
                        {
                            campaignId: Field(campaignId),
                            projectId: Field(projectId),
                        },
                    ),
                );
            const projectCounter = campaign.projectCounter;
            const projectCounterWitness =
                this.participationContractService.projectCounterStorage.getLevel1Witness(
                    this.participationContractService.projectCounterStorage.calculateLevel1Index(
                        Field(campaignId),
                    ),
                );
            const campaignContractRef =
                this.participationContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.CAMPAIGN,
                    PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
                );
            const projectContractRef =
                this.participationContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.PROJECT,
                    PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
                );

            return {
                timeline,
                timelineWitness,
                memberWitnessLevel1,
                memberWitnessLevel2,
                projectIndexWitness,
                projectCounter,
                projectCounterWitness,
                campaignContractRef,
                projectContractRef,
            };
        } catch (err) {
            console.log(err);
            throw new BadRequestException(err);
        }
    }

    async getFundingContractFund(campaignId: number) {
        try {
            const campaign = await this.campaignModel.findOne({
                campaignId: campaignId,
            });
            const distributedKey = await this.keyModel.findOne({
                committeeId: campaign.committeeId,
                keyId: campaign.keyId,
            });
            const timeline = campaign.timeline;
            const timelineWitness =
                this.campaignContractService.timelineStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const projectCounter = campaign.projectCounter;
            const projectCounterWitness =
                this.participationContractService.projectCounterStorage.getLevel1Witness(
                    this.participationContractService.projectCounterStorage.calculateLevel1Index(
                        Field(campaignId),
                    ),
                );
            const committeeId = campaign.committeeId;
            const keyId = campaign.keyId;
            const keyWitnessForRequester = this.requesterContractService
                .storage(process.env.FUNDING_REQUESTER_ADDRESS as string)
                .keyIndexStorage.getLevel1Witness(Field(campaignId));
            const key = distributedKey.key;
            const keyWitnessForDkg =
                this.dkgContractService.dkg.keyStorage.getLevel1Witness(
                    this.dkgContractService.dkg.keyStorage.calculateLevel1Index(
                        {
                            committeeId: Field(campaign.committeeId),
                            keyId: Field(campaign.keyId),
                        },
                    ),
                );
            const fundingContractWitness = this.requesterContractService
                .storage(process.env.FUNDING_REQUESTER_ADDRESS as string)
                .zkAppStorage.getWitness(
                    Field(ZkApp.Requester.RequesterAddressBook.SUBMISSION),
                );
            const campaignContractRef =
                this.fundingContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.CAMPAIGN,
                    PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
                );
            const participationContractRef =
                this.fundingContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.PARTICIPATION,
                    PublicKey.fromBase58(process.env.PARTICIPATION_ADDRESS),
                );
            const dkgContractRef =
                this.fundingContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.DKG,
                    PublicKey.fromBase58(process.env.DKG_ADDRESS),
                );
            const treasuryManagerContractRef =
                this.fundingContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.TREASURY_MANAGER,
                    PublicKey.fromBase58(process.env.TREASURY_MANAGER_ADDRESS),
                );
            const requesterContractRef =
                this.fundingContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.FUNDING_REQUESTER,
                    PublicKey.fromBase58(process.env.FUNDING_REQUESTER_ADDRESS),
                );
            return {
                timeline,
                timelineWitness,
                projectCounter,
                projectCounterWitness,
                committeeId,
                keyId,
                keyWitnessForRequester,
                key,
                keyWitnessForDkg,
                fundingContractWitness,
                campaignContractRef,
                participationContractRef,
                dkgContractRef,
                treasuryManagerContractRef,
                requesterContractRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getFundingContractRefund(fundingId: number, campaignId: number) {
        try {
            const funding = await this.fundingModel.findOne({
                fundingId: fundingId,
            });
            const amount = funding.amount;
            const campaignStateWitness =
                this.treasuryManagerContractService.campaignStateStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const fundingInformationWitness =
                this.fundingContractService.fundingInformationStorage.getLevel1Witness(
                    Field(fundingId),
                );
            const fundingContractWitness =
                this.treasuryManagerContractService.zkAppStorage.getWitness(
                    Field(ZkAppIndex.FUNDING),
                );
            const treasuryManagerContractRef =
                this.fundingContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.TREASURY_MANAGER,
                    PublicKey.fromBase58(process.env.TREASURY_MANAGER_ADDRESS),
                );
            return {
                amount,
                campaignStateWitness,
                fundingInformationWitness,
                fundingContractWitness,
                treasuryManagerContractRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getTreasuryManagerContractCompleteCampaign(campaignId: number) {
        try {
            const campaign = await this.campaignModel.findOne({
                campaignId: campaignId,
            });
            const task = await this.taskModel.findOne({
                requester: process.env.FUNDING_REQUESTER_ADDRESS as string,
                taskId: campaignId,
            });
            const request = await this.dkgRequestModel.findOne({
                task: task.task,
            });
            const requestId = request.requestId;
            const timeline = campaign.timeline;
            const timelineWitness =
                this.campaignContractService.timelineStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const campaignStateWitness =
                this.treasuryManagerContractService.campaignStateStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const taskWitness =
                this.dkgUsageContractsService.dkgRequest.taskStorage.getLevel1Witness(
                    Field(requestId),
                );
            const expirationTimestamp = request.expirationTimestamp;
            const expirationWitness =
                this.dkgUsageContractsService.dkgRequest.expirationStorage.getLevel1Witness(
                    Field(requestId),
                );
            const resultWitness =
                this.dkgUsageContractsService.dkgRequest.resultStorage.getLevel1Witness(
                    Field(requestId),
                );
            const campaignContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.CAMPAIGN,
                    PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
                );
            const requesterContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.FUNDING_REQUESTER,
                    PublicKey.fromBase58(process.env.FUNDING_REQUESTER_ADDRESS),
                );
            const requestContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.REQUEST,
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
            return {
                requestId,
                timeline,
                timelineWitness,
                campaignStateWitness,
                taskWitness,
                expirationTimestamp,
                expirationWitness,
                resultWitness,
                campaignContractRef,
                requesterContractRef,
                requestContractRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getTreasuryManagerContractAbortCampaign(campaignId: number) {
        try {
            const campaign = await this.campaignModel.findOne({
                campaignId: campaignId,
            });
            const task = await this.taskModel.findOne({
                requester: process.env.FUNDING_REQUESTER_ADDRESS as string,
                taskId: campaignId,
            });
            const request = await this.dkgRequestModel.findOne({
                task: task.task,
            });
            const requestId = request.requestId;
            const timeline = campaign.timeline;
            const timelineWitness =
                this.campaignContractService.timelineStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const campaignStateWitness =
                this.treasuryManagerContractService.campaignStateStorage.getLevel1Witness(
                    Field(campaignId),
                );
            const taskWitness =
                this.dkgUsageContractsService.dkgRequest.taskStorage.getLevel1Witness(
                    Field(requestId),
                );
            const expirationTimestamp = request.expirationTimestamp;
            const expirationWitness =
                this.dkgUsageContractsService.dkgRequest.expirationStorage.getLevel1Witness(
                    Field(requestId),
                );
            const resultWitness =
                this.dkgUsageContractsService.dkgRequest.resultStorage.getLevel1Witness(
                    Field(requestId),
                );
            const campaignContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.CAMPAIGN,
                    PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
                );
            const requesterContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.FUNDING_REQUESTER,
                    PublicKey.fromBase58(process.env.FUNDING_REQUESTER_ADDRESS),
                );
            const requestContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.REQUEST,
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
            return {
                requestId,
                timeline,
                timelineWitness,
                campaignStateWitness,
                taskWitness,
                expirationTimestamp,
                expirationWitness,
                resultWitness,
                campaignContractRef,
                requesterContractRef,
                requestContractRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    async getTreasuryManagerContractClaimFund(
        campaignId: number,
        projectId: number,
    ) {
        try {
            // const campaign = await this.campaignModel.findOne({
            //     campaignId: campaignId,
            // });
            const task = await this.taskModel.findOne({
                requester: process.env.FUNDING_REQUESTER_ADDRESS as string,
                taskId: campaignId,
            });
            const participation = await this.participationModel.findOne({
                campaignId: campaignId,
                projectId: projectId,
            });
            const project = await this.projectModel.findOne({
                projectId: projectId,
            });
            const request = await this.dkgRequestModel.findOne({
                task: task.task,
            });
            const projectIndex = participation.projectIndex;
            const projectIndexWitness =
                this.participationContractService.projectIndexStorage.getLevel1Witness(
                    this.participationContractService.projectIndexStorage.calculateLevel1Index(
                        {
                            campaignId: Field(campaignId),
                            projectId: Field(projectId),
                        },
                    ),
                );
            const requestId = request.requestId;
            const taskWitness =
                this.dkgUsageContractsService.dkgRequest.taskStorage.getLevel1Witness(
                    Field(requestId),
                );
            const resultVectorStorage = new ScalarVectorStorage();
            request.result.map((r, index) =>
                resultVectorStorage.updateRawLeaf(
                    { level1Index: Field(index) },
                    Scalar.from(r),
                ),
            );
            const resultVectorWitness =
                this.dkgUsageContractsService.dkgRequest.resultStorage.getLevel1Witness(
                    Field(requestId),
                );
            const resultValueWitness = resultVectorStorage.getLevel1Witness(
                Field(projectIndex - 1),
            );
            const treasuryAddress = project.treasuryAddress;
            const treasuryAddressWitness =
                this.projectContractService.treasuryAddressStorage.getLevel1Witness(
                    Field(projectId),
                );
            const claimedAmountWitness =
                this.treasuryManagerContractService.claimedAmountStorage.getLevel1Witness(
                    this.treasuryManagerContractService.claimedAmountStorage.calculateLevel1Index(
                        {
                            campaignId: Field(campaignId),
                            dimensionIndex: new UInt8(projectIndex - 1),
                        },
                    ),
                );
            const amount = request.result[projectIndex - 1];
            const participationContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.PARTICIPATION,
                    PublicKey.fromBase58(process.env.PARTICIPATION_ADDRESS),
                );
            const requestContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.REQUEST,
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
            const requesterContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.FUNDING_REQUESTER,
                    PublicKey.fromBase58(process.env.FUNDING_REQUESTER_ADDRESS),
                );
            const projectContractRef =
                this.treasuryManagerContractService.zkAppStorage.getZkAppRef(
                    ZkAppIndex.PROJECT,
                    PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
                );
            return {
                projectIndex,
                projectIndexWitness,
                requestId,
                taskWitness,
                resultVectorWitness,
                resultValueWitness,
                treasuryAddress,
                treasuryAddressWitness,
                claimedAmountWitness,
                amount,
                participationContractRef,
                requestContractRef,
                requesterContractRef,
                projectContractRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }
}
