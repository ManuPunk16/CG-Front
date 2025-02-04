import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';
import { Instrument } from '../../../core/models/instrument.model';
import { InstrumentsService } from '../../../core/services/instruments.service';

@Component({
  selector: 'app-instruments-dialog',
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './instruments-dialog.component.html',
  styleUrl: './instruments-dialog.component.scss'
})
export class InstrumentsDialogComponent implements OnInit {

  instrumentForm!: FormGroup;
  instrument!: Instrument;

  constructor(
    public dialog: MatDialogRef<InstrumentsDialogComponent>,
    private _instrument: InstrumentsService,
    private fb: FormBuilder,
    private changeDetectorRef: ChangeDetectorRef
  ){
    this.instrumentForm = new FormGroup({
      name: new FormControl(),
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.changeDetectorRef.detectChanges();
  }

  onSubmit() {
    if (this.instrumentForm.valid) {
      const data: Instrument = this.instrumentForm.value;

      this._instrument.saveInstrument(data).subscribe({
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
        name: [this.instrument.name || null, Validators.required],
        deleted: [false]
      });
    }
  }
}
