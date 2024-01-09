import { Test, TestingModule } from '@nestjs/testing';
import { ObjectStorageController } from './object-storage.controller';

describe('ObjectStorageController', () => {
  let controller: ObjectStorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObjectStorageController],
    }).compile();

    controller = module.get<ObjectStorageController>(ObjectStorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
