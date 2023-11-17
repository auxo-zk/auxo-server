import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Poseidon,
    PublicKey,
    Reducer,
} from 'o1js';
import { CommitteeState } from '../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action } from '../interfaces/action.interface';
import { CommitteeAction } from 'src/schemas/committee-action.schema';

const memberTreeHeight = Number(process.env.MEMBER_TREE_HEIGHT as string);

@Injectable()
export class CommitteeService implements OnModuleInit {
    private readonly eventEnum: { [key: string]: number } = {
        CommitteeCreated: 1,
    };
    private nextCommitteeId: number;
    private committeeTree: MerkleMap;
    private settingTree: MerkleMap;
    private actionStateHash: bigint;

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this.nextCommitteeId = 0;
        this.committeeTree = new MerkleMap();
        this.settingTree = new MerkleMap();
    }

    get state() {
        return {
            committeeTree: this.committeeTree,
            settingTree: this.settingTree,
            nextCommitteeId: this.nextCommitteeId,
            actionStateHash: this.actionStateHash,
        };
    }

    async onModuleInit() {
        const committees = await this.committeeModel.find({ active: true });
        this.insertLeaves(committees);
    }

    async updateMerkleTrees() {
        const committees = await this.committeeModel.find({
            committeeId: { $gte: this.nextCommitteeId },
            active: true,
        });
        this.insertLeaves(committees);
    }

    async getZkAppState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const committeeState: CommitteeState = {
            nextCommitteeId: state[0].toBigInt(),
            committeeTreeRoot: state[1].toBigInt(),
            settingTreeRoot: state[2].toBigInt(),
            actionStateHash: state[3].toBigInt(),
        };
        return committeeState;
    }

    async fetchAllActions(): Promise<void> {
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
                    actions: actions[actionsLength - 1].actions,
                },
                { new: true, upsert: true },
            );

            previousActionState = currentActionState;
            actionsLength -= 1;
            actionId += 1;
        }
    }

    async updateCommittees() {
        const lastCommittee = await this.committeeModel.findOne(
            {},
            {},
            { sort: { committeeIndex: -1 } },
        );
        const temp = await this.committeeActionModel.findOne({
            currentActionState: lastCommittee.actionState,
        });
        const committeeActions = await this.committeeActionModel.find(
            { actionId: { $gt: temp.actionId } },
            {},
            { sort: { actionId: 1 } },
        );
        console.log(committeeActions);
        for (let i = 0; i < committeeActions.length; i++) {
            const committeeAction = committeeActions[i];
            const existed = await this.committeeModel.exists({
                actionState: committeeAction.currentActionState,
            });
            if (!existed) {
                const data = committeeAction.actions[0];
                const previousActionState = Field.from(
                    committeeAction.previousActionState,
                );
                const currentActionState = Field.from(
                    committeeAction.currentActionState,
                );
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

                const committeeIndex =
                    await this.getCommitteeIndex(previousActionState);

                await this.committeeModel.findOneAndUpdate(
                    { actionState: committeeAction.currentActionState },
                    {
                        committeeIndex: committeeIndex,
                        actionState: committeeAction.currentActionState,
                        numberOfMembers: n,
                        threshold: t,
                        publicKeys: publicKeys,
                        ipfsHash: ipfsHash,
                    },
                    { new: true, upsert: true },
                );
            }
        }
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        const lastEvent = rawEvents[rawEvents.length - 1].events;
        const lastActiveCommitteeIndex = Number(lastEvent[0].data[0]);
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
    // ============ PRIVATE FUNCTIONS ============

    private async getCommitteeIndex(
        previousActionState: Field,
    ): Promise<number> {
        if (
            previousActionState.equals(Reducer.initialActionState).toBoolean()
        ) {
            return 0;
        }
        const committee = await this.committeeModel.findOne({
            actionState: previousActionState.toString(),
        });
        return committee.committeeIndex + 1;
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
                Field(this.nextCommitteeId),
                memberTree.getRoot(),
            );
            this.settingTree.set(
                Field(this.nextCommitteeId),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            this.nextCommitteeId += 1;
        }
    }
}
