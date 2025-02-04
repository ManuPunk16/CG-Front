import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionsDialogComponent } from './institutions-dialog.component';

describe('InstitutionsDialogComponent', () => {
  let component: InstitutionsDialogComponent;
  let fixture: ComponentFixture<InstitutionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstitutionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
