import { TestBed } from '@angular/core/testing';

import { GLibService } from './g-lib.service';

describe('GLibService', () => {
  let service: GLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
