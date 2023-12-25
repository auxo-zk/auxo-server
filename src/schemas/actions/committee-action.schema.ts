import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Encoding, Field, Provable, PublicKey } from 'o1js';
import { Committee } from '../committee.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina/utilities';

export const memberTreeHeight = Number(
    process.env.MEMBER_TREE_HEIGHT as string,
);

@Schema({ versionKey: false })
export class CommitteeAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);

export function getCommittee(committeeAction: CommitteeAction): Committee {
    const action = ZkApp.Committee.CommitteeAction.fromFields(
        Utilities.stringArrayToFields(committeeAction.actions),
    );
    const publicKeys: string[] = [];
    for (let i = 0; i < action.addresses.length.toBigInt(); i++) {
        const publicKey = PublicKey.from(action.addresses.values[i]);
        publicKeys.push(publicKey.toBase58());
    }

    const committee: Committee = {
        committeeId: committeeAction.actionId,
        numberOfMembers: publicKeys.length,
        threshold: Number(action.threshold.toString()),
        publicKeys: publicKeys,
        ipfsHash: action.ipfsHash.toString(),
    };
    return committee;
}
