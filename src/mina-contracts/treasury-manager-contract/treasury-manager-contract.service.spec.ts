import { Test, TestingModule } from '@nestjs/testing';
import { TreasuryManagerContractService } from './treasury-manager-contract.service';

describe('TreasuryManagerContractService', () => {
    let service: TreasuryManagerContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TreasuryManagerContractService],
        }).compile();

        service = module.get<TreasuryManagerContractService>(
            TreasuryManagerContractService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
