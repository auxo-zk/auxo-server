import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Poseidon,
    PublicKey,
} from 'o1js';
import { CommitteeState } from '../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

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

    async fetchCommitteeCreatedEvents(fetchAll?: boolean): Promise<void> {
        let lastCommittee: Committee = null;
        if (!fetchAll) {
            lastCommittee = await this.committeeModel.findOne(
                {},
                {},
                { sort: { blockHeight: -1 } },
            );
        }
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
            lastCommittee == null ? undefined : lastCommittee.blockHeight + 1,
        );
        let committeeId =
            lastCommittee == null ? 0 : lastCommittee.committeeId + 1;
        let lastActiveCommittee = 0;
        for (let i = 0; i < rawEvents.length; i++) {
            const events = rawEvents[i].events;
            const blockHeight = rawEvents[i].blockHeight;
            for (let j = 0; j < events.length; j++) {
                const data = events[j].data;
                const eventType = Number(Field.from(data[0]).toString());
                if (eventType == this.eventEnum['CommitteeCreated']) {
                    const publicKeysLength = Number(
                        Field.from(data[1]).toString(),
                    );
                    const publicKeys: string[] = [];
                    for (let k = 0; k < publicKeysLength; k++) {
                        const publicKey = PublicKey.fromFields([
                            Field(data[2 + k * 2]),
                            Field(data[2 + k * 2 + 1]),
                        ]);
                        publicKeys.push(publicKey.toBase58());
                    }
                    const ipfsHashLength = Number(
                        Field.from(
                            data[2 + 2 ** (memberTreeHeight - 1) * 2 + 1],
                        ).toBigInt(),
                    );
                    const ipfsHashFields: Field[] = [];
                    for (let k = 0; k < ipfsHashLength; k++) {
                        ipfsHashFields.push(
                            Field.from(
                                data[
                                    2 + 2 ** (memberTreeHeight - 1) * 2 + 2 + k
                                ],
                            ),
                        );
                    }
                    const ipfsHash = Encoding.stringFromFields(ipfsHashFields);
                    const threshold = Field.from(
                        data[2 + 2 ** (memberTreeHeight - 1) * 2],
                    );
                    await this.committeeModel.findOneAndUpdate(
                        { committeeId: committeeId },
                        {
                            committeeId: committeeId,
                            numberOfMembers: publicKeysLength,
                            threshold: threshold,
                            publicKeys: publicKeys,
                            ipfsHash: ipfsHash,
                            blockHeight: Number(
                                blockHeight.toBigint().toString(),
                            ),
                        },
                        { new: true, upsert: true },
                    );
                    committeeId += 1;
                } else if (eventType == 0) {
                    lastActiveCommittee = Number(
                        Field.from(data[1]).toString(),
                    );
                }
            }

            const activeCommittees = await this.committeeModel.find({
                committeeId: { $lt: lastActiveCommittee },
                active: false,
            });

            for (let i = 0; i < activeCommittees.length; i++) {
                const committee = activeCommittees[i];
                committee.set('active', true);
                await committee.save();
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
