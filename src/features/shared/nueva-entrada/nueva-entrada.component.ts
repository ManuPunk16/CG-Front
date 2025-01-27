import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { formatDate, NgFor, NgIf } from '@angular/common';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { Input } from '../../../core/models/input.model';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatButtonModule } from '@angular/material/button';
import { AreaService } from '../../../core/services/areas.service';
import { Area } from '../../../core/models/area.model';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-nueva-entrada',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    NgFor,
    NgIf,
    MatIconModule,
    MatDatepickerModule,
    NgxMatTimepickerModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nueva-entrada.component.html',
  styleUrl: './nueva-entrada.component.scss'
})
export class NuevaEntradaComponent implements OnInit {

  inputForm!: FormGroup;
  currentUser: any;
  currentYear: number = new Date().getFullYear();
  areas: Area[] = [];

  constructor(
    public dialogRef: MatDialogRef<NuevaEntradaComponent>,
    private fb: FormBuilder,
    private _tokenStorageService: TokenStorageService,
    private _area: AreaService
  ){
    this.currentUser = this._tokenStorageService.getUser();
  }

  ngOnInit(): void {
    this._area.getAllAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
      },
      error: (error) => {
        console.error('Error al obtener las áreas:', error);
      }
    });

    this.inputForm = new FormGroup({
      anio: new FormControl({value: this.currentYear, disabled: false}, Validators.required),
      folio: new FormControl('', Validators.required),
      num_oficio: new FormControl('', Validators.required),
      fecha_oficio: new FormControl('', Validators.required),
      fecha_vencimiento: new FormControl(''),
      fecha_recepcion: new FormControl('', Validators.required),
      hora_recepcion: new FormControl(''),
      instrumento_juridico: new FormControl(''),
      remitente: new FormControl(''),
      institucion_origen: new FormControl(''),
      asunto: new FormControl(''),
      asignado: new FormControl(''),
      estatus: new FormControl(''),
      observacion: new FormControl(''),
      archivosPdf: this.fb.array([]),
      create_user: this.fb.group({
        id: [this.currentUser.id],
        username: [this.currentUser.username]
      }),
      edit_count: new FormControl(0)
    });
  }

  get archivosPdfForms() {
    return this.inputForm.get('archivosPdf') as FormArray;
  }

  addArchivoPdf() {
    this.archivosPdfForms.push(this.fb.control(''));
  }

  removeArchivoPdf(index: number) {
    this.archivosPdfForms.removeAt(index);
  }

  cerrarDialogo(){
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.inputForm.valid) {
      const inputData: Input = this.inputForm.value;

      this.inputForm.value.fecha_oficio = this.inputForm.value.fecha_oficio ? formatDate(this.inputForm.value.fecha_oficio, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_vencimiento = this.inputForm.value.fecha_vencimiento ? formatDate(this.inputForm.value.fecha_vencimiento, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_recepcion = this.inputForm.value.fecha_recepcion ? formatDate(this.inputForm.value.fecha_recepcion, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;

      console.log(inputData); // Aquí envías los datos al backend
    }
  }

}
