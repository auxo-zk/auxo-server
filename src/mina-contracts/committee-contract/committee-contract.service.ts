import {
    Injectable,
    OnModuleInit,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';
import {
    CommitteeAction,
    getCommittee,
} from 'src/schemas/actions/committee-action.schema';
import { Storage, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { CommitteeStorage } from '@auxo-dev/dkg/build/esm/src/contracts/storages';
import { Ipfs } from 'src/ipfs/ipfs';
import { GetCommitteesDto } from 'src/dtos/get-committees.dto';
import { MemberRoleEnum } from 'src/constants';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Key } from 'src/schemas/key.schema';
import { Action } from 'src/interfaces/action.interface';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class CommitteeContractService implements OnModuleInit {
    private readonly logger = new Logger(CommitteeContractService.name);
    private _nextCommitteeId: number;
    private _memberTree: Storage.CommitteeStorage.MemberStorage;
    private _settingTree: Storage.CommitteeStorage.SettingStorage;

    public get memberTree(): Storage.CommitteeStorage.MemberStorage {
        return this._memberTree;
    }

    public get settingTree(): Storage.CommitteeStorage.SettingStorage {
        return this._settingTree;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this._nextCommitteeId = 0;
        this._memberTree = new Storage.CommitteeStorage.MemberStorage();
        this._settingTree = new Storage.CommitteeStorage.SettingStorage();
    }

    async onModuleInit() {
        await this.fetch();
        await this.createTrees();
    }

    async update() {
        await this.fetch();
        await this.createTrees();
    }

    private async fetch() {
        try {
            await this.fetchCommitteeActions();
            await this.updateCommittees();
        } catch (err) {}
    }

    async compile() {
        ZkApp.Committee.CreateCommittee.compile().then(() => {
            this.logger.log('Compile CreateCommittee successfully');
            ZkApp.Committee.CommitteeContract.compile().then(() => {
                this.logger.log('Compile CommitteeContract successfully');
            });
        });
    }

    // async fetchZkAppState(): Promise<CommitteeState> {
    //     const state = await this.queryService.fetchZkAppState(
    //         process.env.COMMITTEE_ADDRESS,
    //     );
    //     const committeeState: CommitteeState = {
    //         nextCommitteeId: state[0],
    //         committeeTreeRoot: state[1],
    //         settingTreeRoot: state[2],
    //         actionState: state[3],
    //     };
    //     return committeeState;
    // }

    // async rollup() {
    //     const state = await this.fetchZkAppState();
    //     let proof = await ZkApp.Committee.CreateCommittee.firstStep(
    //         state.actionState,
    //         state.committeeTreeRoot,
    //         state.settingTreeRoot,
    //         state.nextCommitteeId,
    //     );
    //     const lastReducedAction = await this.committeeActionModel.findOne({
    //         currentActionState: state.actionState.toString(),
    //     });
    //     const notReducedActions = await this.committeeActionModel.find(
    //         {
    //             actionId: { $gt: lastReducedAction.actionId },
    //         },
    //         {},
    //         { sort: { actionId: 1 } },
    //     );
    //     const memberTree = this._memberTree;
    //     const settingTree = this._settingTree;
    //     let nextCommitteeId = this._nextCommitteeId;
    //     for (let i = 0; i < notReducedActions.length; i++) {
    //         const notReducedAction = notReducedActions[i];
    //         proof = await ZkApp.Committee.CreateCommittee.nextStep(
    //             proof,
    //             ZkApp.Committee.CommitteeAction.fromFields(
    //                 Utilities.stringArrayToFields(notReducedAction.actions),
    //             ),
    //             new Storage.CommitteeStorage.Level1Witness(
    //                 memberTree.getWitness(BigInt(nextCommitteeId)),
    //             ),
    //             new Storage.CommitteeStorage.Level1Witness(
    //                 settingTree.getWitness(BigInt(nextCommitteeId)),
    //             ),
    //         );
    //         const committee = await this.committeeModel.findOne({
    //             committeeId: nextCommitteeId,
    //         });
    //         const memberTreeLevel2 = new MerkleTree(
    //             Storage.CommitteeStorage.LEVEL2_TREE_HEIGHT,
    //         );
    //         for (let j = 0; j < committee.numberOfMembers; j++) {
    //             const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
    //             memberTreeLevel2.setLeaf(
    //                 BigInt(j),
    //                 Poseidon.hash(publicKey.toFields()),
    //             );
    //         }
    //         memberTree.setLeaf(BigInt(nextCommitteeId), memberTree.getRoot());
    //         settingTree.setLeaf(
    //             BigInt(nextCommitteeId),
    //             Poseidon.hash([
    //                 Field(committee.threshold),
    //                 Field(committee.numberOfMembers),
    //             ]),
    //         );
    //         nextCommitteeId += 1;
    //     }
    //     const committeeContract = new ZkApp.Committee.CommitteeContract(
    //         PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
    //     );
    //     const feePayerPrivateKey = PrivateKey.fromBase58(
    //         process.env.FEE_PAYER_PRIVATE_KEY,
    //     );
    //     const tx = await Mina.transaction(
    //         {
    //             sender: feePayerPrivateKey.toPublicKey(),
    //             fee: '100000000',
    //         },
    //         () => {
    //             committeeContract.rollupIncrements(proof);
    //         },
    //     );
    //     await tx.prove();
    //     await tx.sign([feePayerPrivateKey]).send();
    //     await this.update();
    // }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchCommitteeActions(): Promise<void> {
        const lastAction = await this.committeeActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.COMMITTEE_ADDRESS,
        );
        let previousActionState: Field;
        let actionId: number;
        if (!lastAction) {
            previousActionState = Reducer.initialActionState;
            actionId = 0;
        } else {
            actions = actions.slice(lastAction.actionId + 1);
            previousActionState = Field(lastAction.currentActionState);
            actionId = lastAction.actionId + 1;
        }
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const currentActionState = Field(action.hash);
            await this.committeeActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState.toString(),
                    previousActionState: previousActionState.toString(),
                    actions: action.actions[0],
                },
                { new: true, upsert: true },
            );
            previousActionState = currentActionState;
            actionId += 1;
        }
    }

    private async updateCommittees() {
        const lastCommittee = await this.committeeModel.findOne(
            {},
            {},
            { sort: { committeeId: -1 } },
        );

        let committeeActions: CommitteeAction[];
        if (lastCommittee != null) {
            committeeActions = await this.committeeActionModel.find(
                { actionId: { $gt: lastCommittee.committeeId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            committeeActions = await this.committeeActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }

        for (let i = 0; i < committeeActions.length; i++) {
            const committeeAction = committeeActions[i];
            const committeeId = committeeAction.actionId;
            const committee = getCommittee(committeeAction);
            committee.ipfsData = await this.ipfs.getData(committee.ipfsHash);
            await this.committeeModel.findOneAndUpdate(
                { committeeId: committeeId },
                committee,
                { new: true, upsert: true },
            );
        }
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActiveCommitteeId = Number(lastEvent[0].data[0]);
            const notActiveCommittees = await this.committeeModel.find(
                {
                    committeeId: { $lte: lastActiveCommitteeId },
                    active: false,
                },
                {},
                { sort: { committeeId: 1 } },
            );
            for (let i = 0; i < notActiveCommittees.length; i++) {
                const notActiveCommittee = notActiveCommittees[i];
                notActiveCommittee.set('active', true);
                await notActiveCommittee.save();
            }
        }
    }

    private async createTrees() {
        const committees = await this.committeeModel.find({ active: true });
        for (let i = 0; i < committees.length; i++) {
            const committee = committees[i];
            const level1IndexMember = this._memberTree.calculateLevel1Index(
                Field(committee.committeeId),
            );
            this._memberTree.updateInternal(
                level1IndexMember,
                Storage.CommitteeStorage.EMPTY_LEVEL_2_TREE(),
            );
            const level1IndexSetting = this._settingTree.calculateLevel1Index(
                Field(committee.committeeId),
            );
            const settingLeaf = this._settingTree.calculateLeaf({
                T: Field(committee.threshold),
                N: Field(committee.numberOfMembers),
            });
            this._settingTree.updateLeaf(settingLeaf, level1IndexSetting);
            for (let j = 0; j < committee.publicKeys.length; j++) {
                const level2IndexMember = this._memberTree.calculateLevel2Index(
                    Field(j),
                );
                const memberLeaf = this._memberTree.calculateLeaf(
                    PublicKey.fromBase58(committee.publicKeys[j]),
                );
                this._memberTree.updateLeaf(
                    memberLeaf,
                    level1IndexMember,
                    level2IndexMember,
                );
            }
        }
    }
    // private insertLeaves(committees: Committee[]) {
    //     for (let i = 0; i < committees.length; i++) {
    //         const committee = committees[i];
    //         const memberTree = new MerkleTree(
    //             Storage.CommitteeStorage.LEVEL2_TREE_HEIGHT,
    //         );
    //         for (let j = 0; j < committee.numberOfMembers; j++) {
    //             const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
    //             memberTree.setLeaf(
    //                 BigInt(j),
    //                 Poseidon.hash(publicKey.toFields()),
    //             );
    //         }
    //         this._memberTree.setLeaf(
    //             BigInt(this._nextCommitteeId),
    //             memberTree.getRoot(),
    //         );
    //         this._settingTree.setLeaf(
    //             BigInt(this._nextCommitteeId),
    //             Poseidon.hash([
    //                 Field(committee.threshold),
    //                 Field(committee.numberOfMembers),
    //             ]),
    //         );
    //         this._nextCommitteeId += 1;
    //     }
    // }
}
