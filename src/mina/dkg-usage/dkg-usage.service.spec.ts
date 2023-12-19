import { Test, TestingModule } from '@nestjs/testing';
import { DkgUsageService } from './dkg-usage.service';

describe('DkgUsageService', () => {
  let service: DkgUsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DkgUsageService],
    }).compile();

    service = module.get<DkgUsageService>(DkgUsageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
