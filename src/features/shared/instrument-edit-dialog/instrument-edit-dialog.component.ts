import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InstrumentsService } from '../../../core/services/instruments.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Instrument } from '../../../core/models/instrument.model';
import { NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-instrument-edit-dialog',
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    NgIf,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './instrument-edit-dialog.component.html',
  styleUrl: './instrument-edit-dialog.component.scss'
})
export class InstrumentEditDialogComponent implements OnInit {

  instrumentForm!: FormGroup;
  instrument!: Instrument;

  constructor(
    public dialog: MatDialogRef<InstrumentEditDialogComponent>,
    private _instrument: InstrumentsService,
    private fb: FormBuilder,
    private changeDetectorRef: ChangeDetectorRef
  ){
    this.instrumentForm = new FormGroup({
      name: new FormControl()
    });
  }

  ngOnInit(): void {
    this.getById();
  }

  getById(){
    if (this.dialog.id) {
      this._instrument.getInstrumentById(this.dialog.id).subscribe({
        next: (res: any) => {
          if (res) {
            this.instrument = res.instrument;
            this.initForm();
            this.changeDetectorRef.detectChanges();
          }
        },
        error: err => {
          console.error(err);
        },
      });
    }
  }

  onSubmit() {
    if (this.instrumentForm.valid && this.instrument) {
      const data = this.instrumentForm.value;

      this._instrument.updateInstrument(this.dialog.id, data).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: '¡Registro editado!',
            text: 'El registro se ha editado correctamente.',
            showConfirmButton: false,
            timer: 1500
          });
          setTimeout(() => {
            this.dialog.close();
          }, 1500);
          this.instrumentForm.reset();
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Algo salió mal. Por favor, inténtalo de nuevo.',
            showConfirmButton: true
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Formulario inválido',
        text: 'Por favor, completa todos los campos requeridos.'
      });
    }
  }

  initForm() {
    if (this.instrument) {
      this.instrumentForm = this.fb.group({
        name: [this.instrument.name || null, Validators.required]
      });
    }
  }
}
