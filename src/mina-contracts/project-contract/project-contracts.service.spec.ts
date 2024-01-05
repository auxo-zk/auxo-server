import { Test, TestingModule } from '@nestjs/testing';
import { ProjectContractService } from './project-contract.service';

describe('ProjectContractService', () => {
    let service: ProjectContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectContractService],
        }).compile();

        service = module.get<ProjectContractService>(ProjectContractService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
