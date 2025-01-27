import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Input } from '../../../core/models/input.model';
import { InputService } from '../../../core/services/input.service';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { NgIf, NgFor, formatDate } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-editar-entrada',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    NgIf,
    ReactiveFormsModule,
    MatDialogModule,
    NgxMatTimepickerModule,
    MatIconModule,
    NgFor,
    MatButtonModule
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ],
  standalone: true,
  templateUrl: './editar-entrada.component.html',
  styleUrl: './editar-entrada.component.scss'
})
export class EditarEntradaComponent implements OnInit, OnDestroy {

  public inputData: string;
  public inputDetails?: Input;
  inputForm!: FormGroup;
  private inputSubscription?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _inputService: InputService,
    public dialogRef: MatDialogRef<EditarEntradaComponent>,
    private fb: FormBuilder
  ) {
    this.inputData = data;
  }

  ngOnInit(): void {
    // console.log(this.inputData);
    if (this.inputData) {
      this.inputSubscription = this._inputService.getInputById(this.inputData).subscribe({
        next: (res: any) => {
          if (res.input) {
            this.inputDetails = res.input;
            console.log(this.inputDetails);
            this.initForm();
          } else {
            console.error("No se encontraron datos del input.");
            // Manejar el caso donde no hay datos, por ejemplo, mostrar un mensaje al usuario
            this.dialogRef.close(); //Cerrar el dialogo si no hay datos.
          }

        },
        error: err => {
          console.log(err);
        }
      });
    } else {
        this.initForm();
    }
  }

  onSubmit() {
    if (this.inputForm.valid) {
      this.inputForm.value.fecha_oficio = this.inputForm.value.fecha_oficio ? formatDate(this.inputForm.value.fecha_oficio, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_vencimiento = this.inputForm.value.fecha_vencimiento ? formatDate(this.inputForm.value.fecha_vencimiento, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_recepcion = this.inputForm.value.fecha_recepcion ? formatDate(this.inputForm.value.fecha_recepcion, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;

      const valoresDelFormulario = this.inputForm.value;
      console.log(valoresDelFormulario);
    }
  }

  initForm() {
    this.inputForm = this.fb.group({
      anio: [this.inputDetails?.anio || null, Validators.required],
      folio: [this.inputDetails?.folio || null, Validators.required],
      num_oficio: [this.inputDetails?.num_oficio || '', Validators.required],
      fecha_oficio: [this.inputDetails?.fecha_oficio || null, Validators.required],
      fecha_vencimiento: [this.inputDetails?.fecha_vencimiento || null],
      fecha_recepcion: [this.inputDetails?.fecha_recepcion || null, Validators.required],
      hora_recepcion: [this.inputDetails?.hora_recepcion || ''],
      instrumento_juridico: [this.inputDetails?.instrumento_juridico || '', Validators.required],
      remitente: [this.inputDetails?.remitente || '', Validators.required],
      institucion_origen: [this.inputDetails?.institucion_origen || '', Validators.required],
      asunto: [this.inputDetails?.asunto || '', Validators.required],
      asignado: [this.inputDetails?.asignado || '', Validators.required],
      estatus: [this.inputDetails?.estatus || '', Validators.required],
      observacion: [this.inputDetails?.observacion || ''],
      archivosPdf: this.fb.array(this.inputDetails?.archivosPdf ? this.inputDetails.archivosPdf.map(pdf => this.fb.control(pdf)) : []), // Inicializa el FormArray
    });
  }

  cerrarDialogo(){
      this.dialogRef.close();
  }

  ngOnDestroy(): void {
    if (this.inputSubscription) {
      this.inputSubscription.unsubscribe();
    }
  }

  get archivosPdfFormArray() {
    return this.inputForm.get('archivosPdf') as FormArray;
  }

  agregarPdf(){
      this.archivosPdfFormArray.push(this.fb.control(''));
  }

  eliminarPdf(index: number){
      this.archivosPdfFormArray.removeAt(index);
  }
}
