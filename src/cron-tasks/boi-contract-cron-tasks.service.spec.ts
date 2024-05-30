import { Test, TestingModule } from '@nestjs/testing';
import { BoiContractCronTasksService } from './boi-contract-cron-tasks.service';

describe('BoiContractCronTasksService', () => {
    let service: BoiContractCronTasksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BoiContractCronTasksService],
        }).compile();

        service = module.get<BoiContractCronTasksService>(
            BoiContractCronTasksService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
