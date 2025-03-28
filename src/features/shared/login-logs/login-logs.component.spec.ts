import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginLogsComponent } from './login-logs.component';

describe('LoginLogsComponent', () => {
  let component: LoginLogsComponent;
  let fixture: ComponentFixture<LoginLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginLogsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
