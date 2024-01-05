import { Test, TestingModule } from '@nestjs/testing';
import { StoragesController } from './storages.controller';

describe('StoragesController', () => {
  let controller: StoragesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoragesController],
    }).compile();

    controller = module.get<StoragesController>(StoragesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
