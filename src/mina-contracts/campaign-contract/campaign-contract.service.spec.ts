import { Test, TestingModule } from '@nestjs/testing';
import { CampaignContractService } from './campaign-contract.service';

describe('CampaignContractService', () => {
    let service: CampaignContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CampaignContractService],
        }).compile();

        service = module.get<CampaignContractService>(CampaignContractService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
