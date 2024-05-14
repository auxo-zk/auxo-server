import { Test, TestingModule } from '@nestjs/testing';
import { RequesterContractsService } from './requester-contract.service';

describe('RequesterContractsService', () => {
    let service: RequesterContractsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RequesterContractsService],
        }).compile();

        service = module.get<RequesterContractsService>(
            RequesterContractsService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
