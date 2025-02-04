import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';
import { InstitutionsService } from '../../../core/services/institutions.service';
import { Institution } from '../../../core/models/institution.model';

@Component({
  selector: 'app-institutions-dialog',
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institutions-dialog.component.html',
  styleUrl: './institutions-dialog.component.scss'
})
export class InstitutionsDialogComponent implements OnInit {

  institutionForm!: FormGroup;
  institution!: Institution;

  constructor(
    public dialog: MatDialogRef<InstitutionsDialogComponent>,
    private _institution: InstitutionsService,
    private fb: FormBuilder,
    private changeDetectorRef: ChangeDetectorRef
  ){
    this.institutionForm = new FormGroup({
      name: new FormControl(),
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.changeDetectorRef.detectChanges();
  }

  onSubmit() {
    if (this.institutionForm.valid) {
      const data: Institution = this.institutionForm.value;

      this._institution.saveInstitution(data).subscribe({
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
          this.institutionForm.reset();
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
    if (this.institution) {
      this.institutionForm = this.fb.group({
        name: [this.institution.name || null, Validators.required],
        deleted: [false]
      });
    }
  }
}
