import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoSeguimientoComponent } from './editar-entrada.component';

describe('NuevoSeguimientoComponent', () => {
  let component: NuevoSeguimientoComponent;
  let fixture: ComponentFixture<NuevoSeguimientoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoSeguimientoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoSeguimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
