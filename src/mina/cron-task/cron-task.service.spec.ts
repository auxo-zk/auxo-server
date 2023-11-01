import { Test, TestingModule } from '@nestjs/testing';
import { CronTaskService } from './cron-task.service';

describe('CronTaskService', () => {
    let service: CronTaskService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CronTaskService],
        }).compile();

        service = module.get<CronTaskService>(CronTaskService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
