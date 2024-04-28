import { Test, TestingModule } from '@nestjs/testing';
import { RequesterContractService } from './requester-contract.service';

describe('RequesterContractService', () => {
    let service: RequesterContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RequesterContractService],
        }).compile();

        service = module.get<RequesterContractService>(
            RequesterContractService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
