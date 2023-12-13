import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Mina,
    Poseidon,
    PrivateKey,
    PublicKey,
    Reducer,
} from 'o1js';
import { CommitteeState } from '../../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';
import {
    CommitteeAction,
    getCommittee,
    memberTreeHeight,
} from 'src/schemas/actions/committee-action.schema';
import { Storage, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { CommitteeStorage } from '@auxo-dev/dkg/build/esm/src/contracts/storages';

@Injectable()
export class CommitteeService implements OnModuleInit {
    private readonly logger = new Logger(CommitteeService.name);
    private nextCommitteeId: number;
    private committeeTree: MerkleTree;
    private settingTree: MerkleTree;
    private actionState: bigint;

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this.nextCommitteeId = 0;
        this.committeeTree = new MerkleTree(
            Storage.CommitteeStorage.LEVEL1_TREE_HEIGHT,
        );
        this.settingTree = new MerkleTree(
            Storage.CommitteeStorage.LEVEL1_TREE_HEIGHT,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.fetch();
        const committees = await this.committeeModel.find({ active: true });
        this.insertLeaves(committees);
    }

    async update() {
        await this.fetch();
        const committees = await this.committeeModel.find(
            {
                committeeId: { $gte: this.nextCommitteeId },
                active: true,
            },
            {},
            { sort: { committeeId: 1 } },
        );
        this.insertLeaves(committees);
    }

    async fetch() {
        await this.fetchAllActions();
    }

    async compile() {
        ZkApp.Committee.CreateCommittee.compile().then(() => {
            this.logger.log('Compile CreateCommittee successfully');
            ZkApp.Committee.CommitteeContract.compile().then(() => {
                this.logger.log('Compile CommitteeContract successfully');
            });
        });
    }

    async fetchZkAppState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const committeeState: CommitteeState = {
            nextCommitteeId: state[0],
            committeeTreeRoot: state[1],
            settingTreeRoot: state[2],
            actionState: state[3],
        };
        return committeeState;
    }

    async rollup() {
        const state = await this.fetchZkAppState();
        let proof = await ZkApp.Committee.CreateCommittee.firstStep(
            state.actionState,
            state.committeeTreeRoot,
            state.settingTreeRoot,
            state.nextCommitteeId,
        );
        const lastReducedAction = await this.committeeActionModel.findOne({
            currentActionState: state.actionState.toString(),
        });
        const notReducedActions = await this.committeeActionModel.find(
            {
                actionId: { $gt: lastReducedAction.actionId },
            },
            {},
            { sort: { actionId: 1 } },
        );
        const committeeTree = this.committeeTree;
        const settingTree = this.settingTree;
        let nextCommitteeId = this.nextCommitteeId;
        for (let i = 0; i < notReducedActions.length; i++) {
            const notReducedAction = notReducedActions[i];
            proof = await ZkApp.Committee.CreateCommittee.nextStep(
                proof,
                ZkApp.Committee.CommitteeAction.fromFields(
                    Utilities.stringArrayToFields(notReducedAction.actions),
                ),
                new Storage.CommitteeStorage.Level1Witness(
                    committeeTree.getWitness(BigInt(nextCommitteeId)),
                ),
                new Storage.CommitteeStorage.Level1Witness(
                    settingTree.getWitness(BigInt(nextCommitteeId)),
                ),
            );
            const committee = await this.committeeModel.findOne({
                committeeId: nextCommitteeId,
            });
            const memberTree = new MerkleTree(memberTreeHeight);
            for (let j = 0; j < committee.numberOfMembers; j++) {
                const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
                memberTree.setLeaf(
                    BigInt(j),
                    Poseidon.hash(publicKey.toFields()),
                );
            }
            committeeTree.setLeaf(
                BigInt(nextCommitteeId),
                memberTree.getRoot(),
            );
            settingTree.setLeaf(
                BigInt(nextCommitteeId),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            nextCommitteeId += 1;
        }
        const committeeContract = new ZkApp.Committee.CommitteeContract(
            PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
        );
        const feePayerPrivateKey = PrivateKey.fromBase58(
            process.env.FEE_PAYER_PRIVATE_KEY,
        );
        const tx = await Mina.transaction(
            {
                sender: feePayerPrivateKey.toPublicKey(),
                fee: '100000000',
            },
            () => {
                committeeContract.rollupIncrements(proof);
            },
        );
        await tx.prove();
        await tx.sign([feePayerPrivateKey]).send();
        await this.update();
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchAllActions(): Promise<void> {
        const promises = [];
        const actions = await this.queryService.fetchActions(
            process.env.COMMITTEE_ADDRESS,
        );
        let actionsLength = actions.length;
        let previousActionState: Field = Reducer.initialActionState;
        let actionId = 0;
        while (actionsLength > 0) {
            const currentActionState = Field.from(
                actions[actionsLength - 1].hash,
            );
            promises.push(
                this.committeeActionModel.findOneAndUpdate(
                    {
                        currentActionState: currentActionState.toString(),
                    },
                    {
                        actionId: actionId,
                        currentActionState: currentActionState.toString(),
                        previousActionState: previousActionState.toString(),
                        actions: actions[actionsLength - 1].actions[0],
                    },
                    { new: true, upsert: true },
                ),
            );
            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
        await Promise.all(promises);
        await this.updateCommittees();
    }

    private async updateCommittees() {
        let promises = [];
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
            promises.push(
                this.committeeModel.findOneAndUpdate(
                    { committeeId: committeeId },
                    getCommittee(committeeAction),
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActiveCommitteeId = Number(lastEvent[0].data[0]);
            const notActiveCommittees = await this.committeeModel.find(
                {
                    committeeId: { $lt: lastActiveCommitteeId },
                    active: false,
                },
                {},
                { sort: { committeeId: 1 } },
            );
            for (let i = 0; i < notActiveCommittees.length; i++) {
                const notActiveCommittee = notActiveCommittees[i];
                notActiveCommittee.set('active', true);
                promises.push(notActiveCommittee.save());
                // await notActiveCommittee.save();
            }
            await Promise.all(promises);
        }
    }

    private insertLeaves(committees: Committee[]) {
        for (let i = 0; i < committees.length; i++) {
            const committee = committees[i];
            const memberTree = new MerkleTree(
                Storage.CommitteeStorage.LEVEL2_TREE_HEIGHT,
            );
            for (let j = 0; j < committee.numberOfMembers; j++) {
                const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
                memberTree.setLeaf(
                    BigInt(j),
                    Poseidon.hash(publicKey.toFields()),
                );
            }
            this.committeeTree.setLeaf(
                BigInt(this.nextCommitteeId),
                memberTree.getRoot(),
            );
            this.settingTree.setLeaf(
                BigInt(this.nextCommitteeId),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            this.nextCommitteeId += 1;
        }
    }
}
