import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstrumentsDialogComponent } from './instruments-dialog.component';

describe('InstrumentsDialogComponent', () => {
  let component: InstrumentsDialogComponent;
  let fixture: ComponentFixture<InstrumentsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstrumentsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstrumentsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
