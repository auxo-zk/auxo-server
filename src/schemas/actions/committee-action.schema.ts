import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Encoding, Field, Provable, PublicKey } from 'o1js';
import { Committee } from '../committee.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina/utilities';

export const memberTreeHeight = Number(
    process.env.MEMBER_TREE_HEIGHT as string,
);

export const enum CommitteeEventEnum {
    COMMITTEE_CREATED,
    __LENGTH,
}

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
    const data = committeeAction.actions;
    // const action = ZkApp.Committee.CommitteeAction.fromFields(
    //     Utilities.stringArrayToFields(committeeAction.actions),
    // );
    // Provable.log(action);
    const n = Number(Field(data[0]).toString());
    const publicKeys: string[] = [];
    for (let i = 0; i < n; i++) {
        const publicKey = PublicKey.fromFields([
            Field(data[1 + i * 2]),
            Field(data[1 + i * 2 + 1]),
        ]);
        publicKeys.push(publicKey.toBase58());
    }
    const t = Number(
        Field(data[1 + 2 ** (memberTreeHeight - 1) * 2]).toBigInt(),
    );
    const ipfsHashLength = Number(
        Field(data[1 + 2 ** (memberTreeHeight - 1) * 2 + 1]).toBigInt(),
    );
    const ipfsHashFields: Field[] = [];
    for (let i = 0; i < ipfsHashLength; i++) {
        ipfsHashFields.push(
            Field(data[1 + 2 ** (memberTreeHeight - 1) * 2 + 2 + i]),
        );
    }
    const ipfsHash = Encoding.stringFromFields(ipfsHashFields);

    const committeeId = committeeAction.actionId;
    const committee: Committee = {
        committeeId: committeeId,
        numberOfMembers: n,
        threshold: t,
        publicKeys: publicKeys,
        ipfsHash: ipfsHash,
    };
    return committee;
}
