import { Test, TestingModule } from '@nestjs/testing';
import { Ipfs } from './ipfs';

describe('Ipfs', () => {
  let provider: Ipfs;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Ipfs],
    }).compile();

    provider = module.get<Ipfs>(Ipfs);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
