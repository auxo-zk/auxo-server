import { Storage } from '@auxo-dev/platform';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey, UInt64 } from 'o1js';
import { FundingStateEnum } from 'src/constants';

@Schema({ versionKey: false })
export class Funding {
    @Prop({ index: true, required: true, unique: true })
    fundingId: number;

    @Prop({ index: true })
    campaignId: number;

    @Prop({ index: true })
    investor: string;

    @Prop()
    amount: number;

    @Prop({ required: true, default: FundingStateEnum.FUNDED })
    state: FundingStateEnum;

    toFundingInformation(): Storage.FundingStorage.FundingInformation {
        return new Storage.FundingStorage.FundingInformation({
            campaignId: Field(this.campaignId),
            investor: PublicKey.fromBase58(this.investor),
            amount: new UInt64(
                this.state == FundingStateEnum.FUNDED ? this.amount : 0,
            ),
        });
    }
}

export type FundingDocument = HydratedDocument<Funding>;
export const FundingSchema = SchemaFactory.createForClass(Funding);
