import { Constants } from '@auxo-dev/dkg';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { ZkAppIndex } from 'src/constants';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from 'src/mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from 'src/mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';
import { Committee } from 'src/schemas/committee.schema';
import { Task } from 'src/schemas/funding-task.schema';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class MethodInputsService {
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly requesterContractService: RequesterContractsService,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
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
            throw new BadRequestException();
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
            const publicKeyWitness = [];
            for (let i = 0; i < committee.numberOfMembers; i++) {
                publicKeyWitness.push(
                    this.dkgContractService.round1.publicKeyStorage.getWitness(
                        this.dkgContractService.round1.publicKeyStorage.calculateLevel1Index(
                            {
                                committeeId: Field(committeeId),
                                keyId: Field(keyId),
                            },
                        ),
                        this.dkgContractService.round1.publicKeyStorage.calculateLevel2Index(
                            Field(i),
                        ),
                    ),
                );
            }

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
}
