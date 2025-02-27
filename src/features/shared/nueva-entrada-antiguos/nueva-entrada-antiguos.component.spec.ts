import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaEntradaAntiguosComponent } from './nueva-entrada-antiguos.component';

describe('NuevaEntradaAntiguosComponent', () => {
  let component: NuevaEntradaAntiguosComponent;
  let fixture: ComponentFixture<NuevaEntradaAntiguosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaEntradaAntiguosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaEntradaAntiguosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
