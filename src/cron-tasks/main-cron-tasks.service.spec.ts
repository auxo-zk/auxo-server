import { Test, TestingModule } from '@nestjs/testing';
import { MainCronTasksService } from './main-cron-tasks.service';

describe('MainCronTasksService', () => {
    let service: MainCronTasksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MainCronTasksService],
        }).compile();

        service = module.get<MainCronTasksService>(MainCronTasksService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
