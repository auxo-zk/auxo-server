import { Test, TestingModule } from '@nestjs/testing';
import { DkgUsageContractsService } from './dkg-usage-contracts.service';

describe('DkgUsageService', () => {
    let service: DkgUsageContractsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DkgUsageContractsService],
        }).compile();

        service = module.get<DkgUsageContractsService>(
            DkgUsageContractsService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
