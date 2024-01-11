import { Test, TestingModule } from '@nestjs/testing';
import { FundingContractService } from './funding-contract.service';

describe('FundingContractService', () => {
    let service: FundingContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FundingContractService],
        }).compile();

        service = module.get<FundingContractService>(FundingContractService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
