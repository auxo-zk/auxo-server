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
import { CommitteeState } from '../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';
import { CommitteeAction } from 'src/schemas/committee-action.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';

const memberTreeHeight = Number(process.env.MEMBER_TREE_HEIGHT as string);

@Injectable()
export class CommitteeService implements OnModuleInit {
    private readonly logger = new Logger(CommitteeService.name);
    private readonly eventEnum: { [key: string]: number } = {
        CommitteeCreated: 1,
    };
    private nextCommitteeIndex: number;
    private committeeTree: MerkleMap;
    private settingTree: MerkleMap;
    private actionState: bigint;

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this.nextCommitteeIndex = 0;
        this.committeeTree = new MerkleMap();
        this.settingTree = new MerkleMap();
    }

    async onModuleInit(): Promise<void> {
        await this.fetch();
        const committees = await this.committeeModel.find({ active: true });
        this.insertLeaves(committees);
        ZkApp.Committee.CreateCommittee.compile().then(() => {
            this.logger.log('Compile CreateCommittee successfully');
            ZkApp.Committee.CommitteeContract.compile().then(() => {
                this.logger.log('Compile CommitteeContract successfully');
                // this.rollup().then(() => {
                //     this.logger.log('Rollup CommitteeContract successfully');
                // });
            });
        });
    }

    async update() {
        await this.fetch();
        const committees = await this.committeeModel.find(
            {
                committeeId: { $gte: this.nextCommitteeIndex },
                active: true,
            },
            {},
            { sort: { committeeIndex: 1 } },
        );
        this.insertLeaves(committees);
    }

    async fetch() {
        await this.fetchAllActions();
        await this.updateCommittees();
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
        let nextCommitteeIndex = this.nextCommitteeIndex;
        for (let i = 0; i < notReducedActions.length; i++) {
            const notReducedAction = notReducedActions[i];
            proof = await ZkApp.Committee.CreateCommittee.nextStep(
                proof,
                ZkApp.Committee.CommitteeAction.fromFields(
                    Utilities.stringArrayToFields(notReducedAction.actions),
                ),
                committeeTree.getWitness(Field.from(nextCommitteeIndex)),
                settingTree.getWitness(Field.from(nextCommitteeIndex)),
            );
            const committee = await this.committeeModel.findOne({
                committeeIndex: nextCommitteeIndex,
            });
            const memberTree = new MerkleTree(memberTreeHeight);
            for (let j = 0; j < committee.numberOfMembers; j++) {
                const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
                memberTree.setLeaf(
                    BigInt(j),
                    Poseidon.hash(publicKey.toFields()),
                );
            }
            committeeTree.set(Field(nextCommitteeIndex), memberTree.getRoot());
            settingTree.set(
                Field(nextCommitteeIndex),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            nextCommitteeIndex += 1;
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
            await this.committeeActionModel.findOneAndUpdate(
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
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
    }

    private async updateCommittees() {
        const lastCommittee = await this.committeeModel.findOne(
            {},
            {},
            { sort: { committeeIndex: -1 } },
        );

        let committeeActions: CommitteeAction[];
        if (lastCommittee != null) {
            committeeActions = await this.committeeActionModel.find(
                { actionId: { $gt: lastCommittee.committeeIndex } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            committeeActions = await this.committeeActionModel.find({});
        }

        for (let i = 0; i < committeeActions.length; i++) {
            const committeeAction = committeeActions[i];
            const data = committeeAction.actions;
            const n = Number(Field.from(data[0]).toString());
            const publicKeys: string[] = [];
            for (let j = 0; j < n; j++) {
                const publicKey = PublicKey.fromFields([
                    Field(data[1 + j * 2]),
                    Field(data[1 + j * 2 + 1]),
                ]);
                publicKeys.push(publicKey.toBase58());
            }
            const t = Number(
                Field.from(
                    data[1 + 2 ** (memberTreeHeight - 1) * 2],
                ).toBigInt(),
            );
            const ipfsHashLength = Number(
                Field.from(
                    data[1 + 2 ** (memberTreeHeight - 1) * 2 + 1],
                ).toBigInt(),
            );
            const ipfsHashFields: Field[] = [];
            for (let j = 0; j < ipfsHashLength; j++) {
                ipfsHashFields.push(
                    Field.from(
                        data[1 + 2 ** (memberTreeHeight - 1) * 2 + 2 + j],
                    ),
                );
            }
            const ipfsHash = Encoding.stringFromFields(ipfsHashFields);

            const committeeIndex = committeeAction.actionId;

            await this.committeeModel.findOneAndUpdate(
                { committeeIndex: committeeIndex },
                {
                    committeeIndex: committeeIndex,
                    numberOfMembers: n,
                    threshold: t,
                    publicKeys: publicKeys,
                    ipfsHash: ipfsHash,
                },
                { new: true, upsert: true },
            );
        }
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        const lastEvent = rawEvents[rawEvents.length - 1].events;
        const lastActiveCommitteeIndex = Number(lastEvent[0].data[0]);
        console.log(lastActiveCommitteeIndex);
        const notActiveCommittees = await this.committeeModel.find({
            committeeIndex: { $lt: lastActiveCommitteeIndex },
            active: false,
        });
        for (let i = 0; i < notActiveCommittees.length; i++) {
            const notActiveCommittee = notActiveCommittees[i];
            notActiveCommittee.set('active', true);
            await notActiveCommittee.save();
        }
    }

    private insertLeaves(committees: Committee[]) {
        for (let i = 0; i < committees.length; i++) {
            const committee = committees[i];
            const memberTree = new MerkleTree(memberTreeHeight);
            for (let j = 0; j < committee.numberOfMembers; j++) {
                const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
                memberTree.setLeaf(
                    BigInt(j),
                    Poseidon.hash(publicKey.toFields()),
                );
            }
            this.committeeTree.set(
                Field(this.nextCommitteeIndex),
                memberTree.getRoot(),
            );
            this.settingTree.set(
                Field(this.nextCommitteeIndex),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            this.nextCommitteeIndex += 1;
        }
    }
}
