import { Test, TestingModule } from '@nestjs/testing';
import { WorkerCronTasksService } from './worker-cron-tasks.service';

describe('WorkerCronTasksService', () => {
    let service: WorkerCronTasksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WorkerCronTasksService],
        }).compile();

        service = module.get<WorkerCronTasksService>(WorkerCronTasksService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
