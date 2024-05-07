import { Constants } from '@auxo-dev/dkg';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Field, PublicKey } from 'o1js';
import { ZkAppEnum } from 'src/constants';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from 'src/mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from 'src/mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';

@Injectable()
export class MethodInputsService {
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
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
                    ZkAppEnum.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.dkg.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.dkg.zkAppStorage.getZkAppRef(
                    ZkAppEnum.DKG,
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
                    ZkAppEnum.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.round1.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROUND1,
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

    getRound2ContractContribute(committeeId: number, memberId: number) {
        try {
            const memberWitness =
                this.committeeContractService.memberStorage.getWitness(
                    Field(committeeId),
                    Field(memberId),
                );
            const committeeRef =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppEnum.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const round1Ref =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );
            const rollupRef =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgContractService.round2.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROUND2,
                    PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
                );
            return {
                memberWitness,
                committeeRef,
                round1Ref,
                rollupRef,
                selfRef,
            };
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getResponseContractContribute(
        committeeId: number,
        memberId: number,
        keyId: number,
        requestId: number,
    ) {
        try {
            const memberWitness =
                this.committeeContractService.memberStorage.getWitness(
                    Field(committeeId),
                    Field(memberId),
                );
            const publicKeyWitness =
                this.dkgContractService.dkg.keyStorage.getWitness(
                    this.dkgContractService.dkg.keyStorage.calculateLevel1Index(
                        {
                            committeeId: Field(committeeId),
                            keyId: Field(keyId),
                        },
                    ),
                );

            const committeeRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppEnum.COMMITTEE,
                    PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
                );
            const round1Ref =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROUND1,
                    PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
                );
            const round2Ref =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROUND2,
                    PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
                );
            const requestRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppEnum.REQUEST,
                    PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
                );
            const rollupRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppEnum.ROLLUP,
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
            const selfRef =
                this.dkgUsageContractsService.dkgResponse.zkAppStorage.getZkAppRef(
                    ZkAppEnum.RESPONSE,
                    PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
                );

            return {
                memberWitness,
                publicKeyWitness,
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
