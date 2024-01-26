import {
    Injectable,
    OnModuleInit,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { AppService } from 'src/app.service';
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
import {
    CommitteeContract,
    CreateCommittee,
    Storage,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Ipfs } from 'src/ipfs/ipfs';
import { zkAppCache } from 'src/constants';
import { Action } from 'src/interfaces/action.interface';
import { CommitteeState } from 'src/interfaces/zkapp-state.interface';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';

@Injectable()
export class CommitteeContractService implements ContractServiceInterface {
    private readonly logger = new Logger(CommitteeContractService.name);
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
        this._memberTree = new Storage.CommitteeStorage.MemberStorage();
        this._settingTree = new Storage.CommitteeStorage.SettingStorage();
    }

    // Why not calling update?
    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            // await this.compile();
            // await this.rollup();
        } catch (err) {}
    }

    async update() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {}
    }

    async fetch() {
        try {
            await this.fetchCommitteeActions();
            await this.updateCommittees();
        } catch (err) {}
    }

    async compile() {
        const cache = zkAppCache;
        await Utilities.compile(CreateCommittee, cache, this.logger);
        await Utilities.compile(CommitteeContract, cache, this.logger);
    }

    async rollup() {
        const lastActiveCommittee = await this.committeeModel.findOne(
            { active: true },
            {},
            { sort: { committeeId: -1 } },
        );
        const lastReducedAction = lastActiveCommittee
            ? await this.committeeActionModel.findOne({
                  actionId: lastActiveCommittee.committeeId,
              })
            : undefined;
        const notReducedActions = await this.committeeActionModel.find(
            {
                actionId: {
                    $gt: lastReducedAction ? lastReducedAction.actionId : 0,
                },
            },
            {},
            { sort: { actionId: 1 } },
        );
        if (notReducedActions.length > 0) {
            const state = await this.fetchCommitteeState();
            let proof = await ZkApp.Committee.CreateCommittee.firstStep(
                state.actionState,
                state.committeeTreeRoot,
                state.settingTreeRoot,
                state.nextCommitteeId,
            );
            const memberTree = this._memberTree;
            const settingTree = this._settingTree;
            let nextCommitteeId = lastActiveCommittee
                ? lastActiveCommittee.committeeId + 1
                : 0;
            for (let i = 0; i < notReducedActions.length; i++) {
                const notReducedAction = notReducedActions[i];
                proof = await CreateCommittee.nextStep(
                    proof,
                    ZkApp.Committee.CommitteeAction.fromFields(
                        Utilities.stringArrayToFields(notReducedAction.actions),
                    ),
                    memberTree.getLevel1Witness(
                        Storage.CommitteeStorage.MemberStorage.calculateLevel1Index(
                            Field(nextCommitteeId),
                        ),
                    ),
                    settingTree.getWitness(
                        Storage.CommitteeStorage.SettingStorage.calculateLevel1Index(
                            Field(nextCommitteeId),
                        ),
                    ),
                );
                const committee = await this.committeeModel.findOne({
                    committeeId: nextCommitteeId,
                });
                const memberTreeLevel2 =
                    Storage.CommitteeStorage.EMPTY_LEVEL_2_TREE();
                for (let j = 0; j < committee.numberOfMembers; j++) {
                    const publicKey = PublicKey.fromBase58(
                        committee.publicKeys[j],
                    );
                    memberTreeLevel2.setLeaf(
                        BigInt(j),
                        Poseidon.hash(publicKey.toFields()),
                    );
                }
                memberTree.updateInternal(
                    Storage.CommitteeStorage.MemberStorage.calculateLevel1Index(
                        Field(nextCommitteeId),
                    ),
                    memberTreeLevel2,
                );
                settingTree.updateLeaf(
                    {
                        level1Index:
                            Storage.CommitteeStorage.SettingStorage.calculateLevel1Index(
                                Field(nextCommitteeId),
                            ),
                    },
                    Storage.CommitteeStorage.SettingStorage.calculateLeaf({
                        T: Field(committee.threshold),
                        N: Field(committee.numberOfMembers),
                    }),
                );
                nextCommitteeId += 1;
            }
            const committeeContract = new CommitteeContract(
                PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
            );
            const feePayerPrivateKey = PrivateKey.fromBase58(
                process.env.FEE_PAYER_PRIVATE_KEY,
            );
            const tx = await Mina.transaction(
                {
                    sender: feePayerPrivateKey.toPublicKey(),
                    fee: process.env.FEE,
                },
                () => {
                    committeeContract.rollupIncrements(proof);
                },
            );
            await Utilities.proveAndSend(
                tx,
                feePayerPrivateKey,
                false,
                this.logger,
            );
        }
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchCommitteeState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const committeeState: CommitteeState = {
            nextCommitteeId: Field(state[0]),
            committeeTreeRoot: Field(state[1]),
            settingTreeRoot: Field(state[2]),
            actionState: Field(state[3]),
        };
        return committeeState;
    }

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

    async updateMerkleTrees() {
        try {
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
                const level1IndexSetting =
                    this._settingTree.calculateLevel1Index(
                        Field(committee.committeeId),
                    );
                const settingLeaf = this._settingTree.calculateLeaf({
                    T: Field(committee.threshold),
                    N: Field(committee.numberOfMembers),
                });
                this._settingTree.updateLeaf(
                    { level1Index: level1IndexSetting },
                    settingLeaf,
                );
                for (let j = 0; j < committee.publicKeys.length; j++) {
                    const level2IndexMember =
                        this._memberTree.calculateLevel2Index(Field(j));
                    const memberLeaf = this._memberTree.calculateLeaf(
                        PublicKey.fromBase58(committee.publicKeys[j]),
                    );
                    this._memberTree.updateLeaf(
                        {
                            level1Index: level1IndexMember,
                            level2Index: level2IndexMember,
                        },
                        memberLeaf,
                    );
                }
            }
        } catch (err) {}
    }
}
