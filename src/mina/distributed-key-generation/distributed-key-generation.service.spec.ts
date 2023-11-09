import { Test, TestingModule } from '@nestjs/testing';
import { DistributedKeyGenerationService } from './distributed-key-generation.service';

describe('DistributedKeyGenerationService', () => {
    let service: DistributedKeyGenerationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DistributedKeyGenerationService],
        }).compile();

        service = module.get<DistributedKeyGenerationService>(
            DistributedKeyGenerationService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
