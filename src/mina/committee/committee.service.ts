import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, MerkleMap, MerkleTree, Poseidon, PublicKey } from 'o1js';
import { CommitteeState } from '../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const memberTreeHeight = Number(process.env.MEMBER_TREE_HEIGHT as string);

@Injectable()
export class CommitteeService implements OnModuleInit {
    private nextCommitteeId: number;
    private committeeTree: MerkleMap;
    private settingTree: MerkleMap;
    private actionStateHash: bigint;

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(Committee.name) private committeeModel: Model<Committee>,
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
        const committees = await this.committeeModel.find();
        this.insertLeaves(committees);
    }

    async updateMerkleTrees() {
        const committees = await this.committeeModel.find({
            committeeId: { $gte: this.nextCommitteeId },
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

    async fetchCommitteeCreatedEvents(fetchAll?: boolean): Promise<void> {
        let lastCommittee: Committee = null;
        if (!fetchAll) {
            lastCommittee = await this.committeeModel.findOne(
                {},
                {},
                { sort: { committeeId: -1 } },
            );
        }
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
            lastCommittee == null ? undefined : lastCommittee.blockHeight + 1,
        );
        let committeeId =
            lastCommittee == null ? 0 : lastCommittee.committeeId + 1;
        for (let i = 0; i < rawEvents.length; i++) {
            const events = rawEvents[i].events;
            const blockHeight = rawEvents[i].blockHeight;
            for (let i = 0; i < events.length; i++) {
                const data = events[i].data;
                const eventType = Number(Field.from(data[0]).toString());
                if (eventType == 0) {
                    const addressesLength = Number(
                        Field.from(data[1]).toString(),
                    );
                    const publicKeys: string[] = [];
                    for (let i = 0; i < addressesLength; i++) {
                        const publicKey = PublicKey.fromFields([
                            Field(data[2 + i * 2]),
                            Field(data[2 + i * 2 + 1]),
                        ]);
                        publicKeys.push(publicKey.toBase58());
                    }
                    const threshold = Field.from(
                        data[2 + 2 ** (memberTreeHeight - 1) * 2],
                    );
                    await this.committeeModel.findOneAndUpdate(
                        { committeeId: committeeId },
                        {
                            committeeId: committeeId,
                            numberOfMembers: addressesLength,
                            threshold: threshold,
                            publicKeys: publicKeys,
                            blockHeight: Number(
                                blockHeight.toBigint().toString(),
                            ),
                        },
                        { new: true, upsert: true },
                    );
                    committeeId += 1;
                }
            }
        }
    }

    // ============ PRIVATE FUNCTIONS ============

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
