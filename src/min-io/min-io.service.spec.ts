import { Test, TestingModule } from '@nestjs/testing';
import { MinIoService } from './min-io.service';

describe('MinIoService', () => {
    let service: MinIoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MinIoService],
        }).compile();

        service = module.get<MinIoService>(MinIoService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
