import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Input } from '../../../core/models/input.model';
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
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-editar-entrada',
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
  templateUrl: './editar-entrada.component.html',
  styleUrl: './editar-entrada.component.scss'
})
export class EditarEntradaComponent implements OnInit {

  public id: any;
  public inputDetails?: Input;
  inputForm!: FormGroup;
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
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.inputForm = new FormGroup({
      anio: new FormControl(),
      folio: new FormControl(),
      num_oficio: new FormControl(),
      fecha_oficio: new FormControl(),
      fecha_vencimiento: new FormControl(),
      fecha_recepcion: new FormControl(),
      hora_recepcion: new FormControl(),
      instrumento_juridico: new FormControl(),
      remitente: new FormControl(),
      institucion_origen: new FormControl(),
      asunto: new FormControl(),
      asignado: new FormControl(),
      estatus: new FormControl(),
      observacion: new FormControl(),
      archivosPdf: this.fb.array([]),
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
    if (this.inputForm.valid) {
      this.inputForm.value.fecha_oficio = this.inputForm.value.fecha_oficio ? formatDate(this.inputForm.value.fecha_oficio, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_vencimiento = this.inputForm.value.fecha_vencimiento ? formatDate(this.inputForm.value.fecha_vencimiento, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_recepcion = this.inputForm.value.fecha_recepcion ? formatDate(this.inputForm.value.fecha_recepcion, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;

      const valoresDelFormulario = this.inputForm.value;
      console.log(valoresDelFormulario);
    } else {
      console.log("Hola");
    }
  }

  getAreas() {
    this._area.getAllAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.changeDetectorRef.detectChanges();
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
        this.changeDetectorRef.detectChanges();
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
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Error al obtener las instituciones:', error);
      }
    });
  }

  initForm() {
    this.inputForm = new FormGroup({
      anio: new FormControl(this.inputDetails?.anio || null, Validators.required),
      folio: new FormControl(this.inputDetails?.folio || null, Validators.required),
      num_oficio: new FormControl(this.inputDetails?.num_oficio || '', Validators.required),
      fecha_oficio: new FormControl(this.inputDetails?.fecha_oficio || null, Validators.required),
      fecha_vencimiento: new FormControl(this.inputDetails?.fecha_vencimiento || null),
      fecha_recepcion: new FormControl(this.inputDetails?.fecha_recepcion || null, Validators.required),
      hora_recepcion: new FormControl(this.inputDetails?.hora_recepcion || ''),
      instrumento_juridico: new FormControl(this.inputDetails?.instrumento_juridico || '', Validators.required),
      remitente: new FormControl(this.inputDetails?.remitente || '', Validators.required),
      institucion_origen: new FormControl(this.inputDetails?.institucion_origen || '', Validators.required),
      asunto: new FormControl(this.inputDetails?.asunto || '', Validators.required),
      asignado: new FormControl(this.inputDetails?.asignado || '', Validators.required),
      estatus: new FormControl(this.inputDetails?.estatus || '', Validators.required),
      observacion: new FormControl(this.inputDetails?.observacion || ''),
      archivosPdf: this.fb.array(this.inputDetails?.archivosPdf ? this.inputDetails.archivosPdf.map(pdf => this.fb.control(pdf)) : [], [this.archivosPdfValidator]),
    });
  }

  archivosPdfValidator(control: AbstractControl): { requerido: boolean; } | null {
    const formArray = control as FormArray; // Hacemos un cast seguro
    if (formArray.length === 0) {
      return { requerido: true };
    }
    return null;
  }

  get archivosPdfFormArray() {
    return this.inputForm.get('archivosPdf') as FormArray;
  }

  agregarPdf(){
      this.archivosPdfFormArray.push(this.fb.control(''));
  }

  eliminarPdf(index: number){
      this.archivosPdfFormArray.removeAt(index);
      this.inputForm.markAllAsTouched();
      this.changeDetectorRef.detectChanges();
  }
}
