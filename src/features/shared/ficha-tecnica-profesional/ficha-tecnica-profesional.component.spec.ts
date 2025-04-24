import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaTecnicaProfesionalComponent } from './ficha-tecnica-profesional.component';

describe('FichaTecnicaProfesionalComponent', () => {
  let component: FichaTecnicaProfesionalComponent;
  let fixture: ComponentFixture<FichaTecnicaProfesionalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaTecnicaProfesionalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichaTecnicaProfesionalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
