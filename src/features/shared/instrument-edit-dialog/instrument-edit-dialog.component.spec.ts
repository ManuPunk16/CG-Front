import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstrumentEditDialogComponent } from './instrument-edit-dialog.component';

describe('InstrumentEditDialogComponent', () => {
  let component: InstrumentEditDialogComponent;
  let fixture: ComponentFixture<InstrumentEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstrumentEditDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstrumentEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
