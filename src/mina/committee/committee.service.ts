import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, Group, MerkleMap, MerkleTree, Poseidon, PublicKey } from 'o1js';
import { CommitteeState } from '../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import DynamicArray from '../utilities/dynamic-array';

const memberTreeHeight = Number(process.env.MEMBER_TREE_HEIGHT as string);

@Injectable()
export class CommitteeService implements OnModuleInit {
    private committeeTree: MerkleMap;
    private settingTree: MerkleMap;
    private lastCommitteeId: number;

    constructor(
        private readonly queryService: QueryService,
        @InjectModel(Committee.name) private committeeModel: Model<Committee>,
    ) {
        this.committeeTree = new MerkleMap();
        this.settingTree = new MerkleMap();
        this.lastCommitteeId = 0;
    }

    get state() {
        return {
            committeeTree: this.committeeTree,
            settingTree: this.settingTree,
            lastCommitteeId: this.lastCommitteeId,
        };
    }

    async onModuleInit() {
        const committees = await this.committeeModel.find();
        this.insertLeaves(committees);
    }

    async updateMerkleTrees() {
        const committees = await this.committeeModel.find({
            committeeId: { $gte: this.lastCommitteeId },
        });
        this.insertLeaves(committees);
    }

    async getZkAppState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const committeeState: CommitteeState = {
            committeeTreeRoot: state[0].toBigInt(),
            settingTreeRoot: state[1].toBigInt(),
            nextCommitteeId: state[2].toBigInt(),
        };
        return committeeState;
    }

    async fetchAllCommitteeCreatedEvents(): Promise<void> {
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        let committeeId = 0;
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
                        const x = data[2 + i * 2];
                        const y = data[2 + i * 2 + 1];
                        const publicKey = PublicKey.fromGroup(Group.from(x, y));
                        publicKeys.push(publicKey.toBase58());
                    }
                    const threshold = Field.from(data[2 + 32 * 2]);
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

    async fetchCommitteeCreatedEvents(): Promise<void> {
        const lastCommittee = await this.committeeModel.findOne(
            {},
            {},
            { sort: { committeeId: -1 } },
        );
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
            lastCommittee == null ? 0 : lastCommittee.blockHeight,
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
                        const x = data[2 + i * 2];
                        const y = data[2 + i * 2 + 1];
                        const publicKey = PublicKey.fromGroup(Group.from(x, y));
                        publicKeys.push(publicKey.toBase58());
                    }
                    const threshold = Field.from(data[2 + 32 * 2]);
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

    async merkleTree() {
        const committeeTree = new MerkleMap();
        const committees = await this.committeeModel.find();
        for (let i = 0; i < committees.length; i++) {
            const memberTree = new MerkleTree(memberTreeHeight);
            const committee = committees[i];
            const temp = [];
            for (let j = 0; j < committee.numberOfMembers; j++) {
                temp.push(
                    PublicKey.fromBase58(committee.publicKeys[j]).toGroup(),
                );
            }
            const publicKeys = new GroupArray(temp);
            for (let j = 0; j < 32; j++) {
                memberTree.setLeaf(
                    BigInt(j),
                    GroupArray.hash(publicKeys.get(Field(j))),
                );
            }
            // for (let j = 0; j < committee.numberOfMembers; j++) {
            //     memberTree.setLeaf(
            //         BigInt(j),
            //         Poseidon.hash(
            //             PublicKey.fromBase58(
            //                 committee.publicKeys[j],
            //             ).toFields(),
            //         ),
            //     );
            // }
            console.log(memberTree.getRoot().toBigInt());
            committeeTree.set(Field(i), memberTree.getRoot());
        }
        console.log(committeeTree.getRoot().toBigInt());
        const appState = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        for (let i = 0; i < appState.length; i++) {
            console.log(appState[i].toBigInt());
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
                Field(this.lastCommitteeId),
                memberTree.getRoot(),
            );
            this.settingTree.set(
                Field(this.lastCommitteeId),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            this.lastCommitteeId += 1;
        }
    }
}

export class GroupArray extends DynamicArray(
    Group,
    2 ** (memberTreeHeight - 1),
) {}
