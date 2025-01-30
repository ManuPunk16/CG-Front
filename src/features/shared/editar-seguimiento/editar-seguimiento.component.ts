import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Input, Seguimiento } from '../../../core/models/input.model';
import { InputService } from '../../../core/services/input.service';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormArray, FormControl, AbstractControl } from '@angular/forms';
import { NgIf, NgFor, formatDate } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Area } from '../../../core/models/area.model';
import { AreaService } from '../../../core/services/areas.service';
import { Institution } from '../../../core/models/institution.model';
import { InstitutionsService } from '../../../core/services/institutions.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { InstrumentsService } from '../../../core/services/instruments.service';
import { Instrument } from '../../../core/models/instrument.model';
import { EstatusEntrada } from '../../../core/models/estatus.model';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-editar-seguimiento',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    NgIf,
    ReactiveFormsModule,
    NgxMatTimepickerModule,
    MatIconModule,
    NgFor,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCardModule
  ],
  providers: [
      provideNativeDateAdapter(),
      { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
    ],
  standalone: true,
  templateUrl: './editar-seguimiento.component.html',
  styleUrl: './editar-seguimiento.component.scss'
})
export class EditarSeguimientoComponent implements OnInit {

  public id: any;
  public seguimientoDetails!: Seguimiento;
  public inputDetails!: Input;
  seguimientoForm!: FormGroup;
  areas: Area[] = [];
  institutions: Institution[] = [];
  instruments: Instrument[] = [];
  estatusOptions = Object.values(EstatusEntrada);

  constructor(
    private _inputService: InputService,
    private fb: FormBuilder,
    private _area: AreaService,
    private _institution: InstitutionsService,
    private _instrument: InstrumentsService,
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.seguimientoForm = new FormGroup({
      oficio_salida: new FormControl(),
      num_expediente: new FormControl(),
      fecha_oficio_salida: new FormControl(),
      fecha_acuse_recibido: new FormControl(),
      destinatario: new FormControl(),
      cargo: new FormControl(),
      atencion_otorgada: new FormControl(),
      anexo: new FormControl(),
      estatus: new FormControl(),
      comentarios: new FormControl(),
      firma_visado: new FormControl(),
      archivosPdf_seguimiento: this.fb.array([]),
      fecha_respuesta: new FormControl()
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        this._inputService.getInputById(this.id).subscribe({
          next: (res: any) => {
            if (res.input) {
              this.inputDetails = res.input;
              // console.log(this.inputDetails);
              this.getInstitutions();
              this.getAreas();
              this.getInstruments();
              this.initForm();
              this.changeDetectorRef.detectChanges();
            } else {
              console.error("No se encontraron datos del input.");
            }
          },
          error: err => {
            console.log(err);
          }
        });
      }
    });
  }

  onSubmit() {
    if (this.seguimientoForm.valid) {
      this.seguimientoForm.value.fecha_oficio = this.seguimientoForm.value.fecha_oficio ? formatDate(this.seguimientoForm.value.fecha_oficio, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.seguimientoForm.value.fecha_vencimiento = this.seguimientoForm.value.fecha_vencimiento ? formatDate(this.seguimientoForm.value.fecha_vencimiento, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.seguimientoForm.value.fecha_recepcion = this.seguimientoForm.value.fecha_recepcion ? formatDate(this.seguimientoForm.value.fecha_recepcion, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;

      const valoresDelFormulario = this.seguimientoForm.value;
      console.log(valoresDelFormulario);
    } else {
      console.log("Hola");
    }
  }

  initForm() {
    this.seguimientoForm = new FormGroup({
      oficio_salida: new FormControl(this.inputDetails?.seguimientos?.oficio_salida || null, Validators.required),
      num_expediente: new FormControl(this.inputDetails?.seguimientos?.num_expediente || null),
      fecha_oficio_salida: new FormControl(this.inputDetails?.seguimientos?.fecha_oficio_salida || null),
      fecha_acuse_recibido: new FormControl(this.inputDetails?.seguimientos?.fecha_acuse_recibido || null, Validators.required),
      destinatario: new FormControl(this.inputDetails?.seguimientos?.destinatario || null, Validators.required),
      cargo: new FormControl(this.inputDetails?.seguimientos?.cargo || null, Validators.required),
      atencion_otorgada: new FormControl(this.inputDetails?.seguimientos?.atencion_otorgada || null, Validators.required),
      anexo: new FormControl(this.inputDetails?.seguimientos?.anexo || null),
      estatus: new FormControl(this.inputDetails?.estatus || null, Validators.required),
      comentarios: new FormControl(this.inputDetails?.seguimientos?.comentarios || null),
      firma_visado: new FormControl(this.inputDetails?.seguimientos?.firma_visado || null),
      archivosPdf_seguimiento: this.fb.array(this.inputDetails?.seguimientos?.archivosPdf_seguimiento ? this.inputDetails.seguimientos.archivosPdf_seguimiento.map(pdf => this.fb.control(pdf)) : [], [Validators.required, this.archivosPdfValidator]),
      fecha_respuesta: new FormControl(this.inputDetails?.seguimientos?.fecha_respuesta || null)
    });
  }

  getAreas() {
    this._area.getAllAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
      },
      error: (error) => {
        console.error('Error al obtener las áreas:', error);
      }
    });
  }

  getInstitutions() {
    this._institution.getAllNoDeletedInstitutions().subscribe({
      next: (res) => {
        this.institutions = res;
      },
      error: (error) => {
        console.error('Error al obtener las instituciones:', error);
      }
    });
  }

  getInstruments() {
    this._instrument.getAllNoDeletedInstruments().subscribe({
      next: (res) => {
        this.instruments = res;
      },
      error: (error) => {
        console.error('Error al obtener las instituciones:', error);
      }
    });
  }

  archivosPdfValidator(control: AbstractControl): { requerido: boolean; } | null {
    const formArray = control as FormArray; // Hacemos un cast seguro
    if (formArray.length === 0) {
      return { requerido: true };
    }
    return null;
  }

  get archivosPdf_seguimientoFromArray() {
    return this.seguimientoForm.get('archivosPdf_seguimiento') as FormArray;
  }

  agregarPdf(){
      this.archivosPdf_seguimientoFromArray.push(this.fb.control(''));
  }

  eliminarPdf(index: number){
      this.archivosPdf_seguimientoFromArray.removeAt(index);
      this.seguimientoForm.markAllAsTouched();
      this.changeDetectorRef.detectChanges();
  }

  salirSinGuardar() {
    if (!this.seguimientoForm.dirty) { // Verifica si el formulario ha sido modificado
      const confirmacion = window.confirm('¿Estás seguro de que quieres salir sin guardar los cambios?');
      if (confirmacion) {
        this.router.navigate(['/Entradas']);
      }
    } else {
      this.router.navigate(['/Entradas']); // Navega directamente si no hay cambios
    }
  }
}
