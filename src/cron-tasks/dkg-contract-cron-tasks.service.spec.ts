import { Test, TestingModule } from '@nestjs/testing';
import { DkgContractCronTasksService } from './dkg-contract-cron-tasks.service';

describe('DkgContractCronTasksService', () => {
    let service: DkgContractCronTasksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DkgContractCronTasksService],
        }).compile();

        service = module.get<DkgContractCronTasksService>(
            DkgContractCronTasksService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
