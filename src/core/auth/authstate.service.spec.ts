import { TestBed } from '@angular/core/testing';

import { AuthstateService } from './authstate.service';

describe('AuthstateService', () => {
  let service: AuthstateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthstateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
