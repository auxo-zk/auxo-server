import { Test, TestingModule } from '@nestjs/testing';
import { FundingRequesterContractService } from './requester-contract.service';

describe('FundingRequesterContractService', () => {
    let service: FundingRequesterContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FundingRequesterContractService],
        }).compile();

        service = module.get<FundingRequesterContractService>(
            FundingRequesterContractService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
