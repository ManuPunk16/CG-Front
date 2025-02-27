import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder, FormArray, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { formatDate, NgFor, NgIf } from '@angular/common';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { Input } from '../../../core/models/input.model';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatButtonModule } from '@angular/material/button';
import { AreaService } from '../../../core/services/areas.service';
import { Area } from '../../../core/models/area.model';
import { MatSelectModule } from '@angular/material/select';
import { Institution } from '../../../core/models/institution.model';
import { InstitutionsService } from '../../../core/services/institutions.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { InstrumentsService } from '../../../core/services/instruments.service';
import { Instrument } from '../../../core/models/instrument.model';
import { EstatusEntrada } from '../../../core/models/estatus.model';
import { InputService } from '../../../core/services/input.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nueva-entrada-antiguos',
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
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule
  ],
  providers: [
      provideNativeDateAdapter(),
      { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
    ],
    standalone: true,
  templateUrl: './nueva-entrada-antiguos.component.html',
  styleUrl: './nueva-entrada-antiguos.component.scss'
})
export class NuevaEntradaAntiguosComponent implements OnInit {

  inputForm!: FormGroup;
  currentUser: any;
  currentYear: number = new Date().getFullYear();
  areas: Area[] = [];
  institutions: Institution[] = [];
  instruments: Instrument[] = [];
  estatusOptions = Object.values(EstatusEntrada);

  isLoggedIn = false;
  private roles: string[] = [];
  username?: string;
  showAdmin = false;
  showLinker = false;
  showModerator = false;

  constructor(
    private fb: FormBuilder,
    private _tokenStorageService: TokenStorageService,
    private _area: AreaService,
    private _institution: InstitutionsService,
    private _instrument: InstrumentsService,
    private changeDetectorRef: ChangeDetectorRef,
    private _inputService: InputService,
    private router: Router,
  ){
    this.currentUser = this._tokenStorageService.getUser();
  }

  ngOnInit(): void {
    this.isLoggedIn = !!this._tokenStorageService.getToken();
    if (this.isLoggedIn) {
      const user = this._tokenStorageService.getUser();
      this.roles = user.roles;
      this.showAdmin = this.roles.includes('ROLE_ADMIN');
      this.showLinker = this.roles.includes('ROLE_LINKER');
      this.showModerator = this.roles.includes('ROLE_MODERATOR');
      this.username = user.username;
    }

    this.getAreas();
    this.getInstitutions();
    this.getInstruments();
    this.newForm();
    // this.obtenerUltimoFolio();
    this.changeDetectorRef.detectChanges();
  }

  newForm() {
    this.inputForm = this.fb.group({
      anio: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      folio: ['', Validators.required],
      num_oficio: ['', Validators.required],
      fecha_oficio: ['', Validators.required],
      fecha_vencimiento: [''],
      fecha_recepcion: ['', Validators.required],
      hora_recepcion: [''],
      instrumento_juridico: ['', Validators.required],
      remitente: ['', Validators.required],
      institucion_origen: ['', Validators.required],
      asunto: ['', Validators.required],
      asignado: ['', Validators.required],
      estatus: ['', Validators.required],
      observacion: [''],
      archivosPdf: this.fb.array([]),
      create_user: this.fb.group({
        id: [this.currentUser.id],
        username: [this.currentUser.username]
      }),
      edit_count: [0],
      deleted: [false],
      seguimientos: this.fb.array([]),
      timestamps: new FormControl(new Date()),
    });
  }

  filterInput(event: any) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Elimina caracteres no numéricos
    value = value.replace(/[^0-9]/g, '');

    // Limita la longitud a 4 dígitos
    if (value.length > 4) {
      value = value.slice(0, 4);
    }

    // Actualiza el valor del input
    input.value = value;
    this.inputForm.get('anio')?.setValue(value);
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

  get archivosPdfForms() {
    return this.inputForm.get('archivosPdf') as FormArray;
  }

  addArchivoPdf() {
    this.archivosPdfForms.push(this.fb.control(''));
  }

  removeArchivoPdf(index: number) {
    this.archivosPdfForms.removeAt(index);
    this.inputForm.markAllAsTouched();
    this.changeDetectorRef.detectChanges();
  }

  archivosPdfValidator(control: AbstractControl): { requerido: boolean; } | null {
    const formArray = control as FormArray; // Hacemos un cast seguro
    if (formArray.length === 0) {
      return { requerido: true };
    }
    return null;
  }

  // obtenerUltimoFolio() {
  //   this._inputService.obtenerUltimoFolio(this.currentYear).subscribe(folio => {
  //     if (folio !== undefined && folio !== null) { // Verifica si folio es un número válido
  //       this.inputForm.patchValue({ folio: folio + 1 });
  //     } else {
  //       this.inputForm.patchValue({ folio: 1 }); // O puedes dejarlo en blanco: this.inputForm.patchValue({ folio: '' });
  //     }
  //   });
  // }

  onSubmit() {
    if (this.inputForm.valid) {
      const inputData: Input = this.inputForm.value;

      const archivosPdf = inputData.archivosPdf.filter((path: string) => path !== '');

      inputData.archivosPdf = archivosPdf;

      this.inputForm.value.fecha_oficio = this.inputForm.value.fecha_oficio ? formatDate(this.inputForm.value.fecha_oficio, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_vencimiento = this.inputForm.value.fecha_vencimiento ? formatDate(this.inputForm.value.fecha_vencimiento, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
      this.inputForm.value.fecha_recepcion = this.inputForm.value.fecha_recepcion ? formatDate(this.inputForm.value.fecha_recepcion, 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;

      const anio = this.inputForm.value.anio;
      const folio = inputData.folio;

      this._inputService.verificarFolioExistente(anio, folio).subscribe(existe => {
        if (existe) {
          Swal.fire({
            icon: 'error',
            title: 'Folio Duplicado',
            text: `Ya existe un registro con el folio ${folio} en el año ${anio}. Por favor, ingrese un folio diferente.`,
          });
        } else {
          this._inputService.createInput(inputData).subscribe({ // Llama al servicio
            next: (res) => {
              // Restablece el formulario o muestra un mensaje de éxito
              Swal.fire({
                icon: 'success',
                title: '¡Registro creado!',
                text: 'El registro se ha creado correctamente.',
                showConfirmButton: false,
                timer: 1500
              });
              this.inputForm.reset();
              this.router.navigate(['/Entradas']);// Puedes navegar a otra página o mostrar un mensaje de éxito
            },
            error: (err) => {
              console.error('Error al crear el registro:', err);
              // Muestra el mensaje de error al usuario (usando un servicio de notificaciones, por ejemplo)
              Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Algo salió mal. Por favor, inténtalo de nuevo.',
                showConfirmButton: true
              });
            }
          });
        }
      });
    } else {
      console.log("Formulario no válido");
      Swal.fire({
        icon: 'warning',
        title: 'Formulario inválido',
        text: 'Por favor, completa todos los campos requeridos.'
      });
    }
  }

  // Función para limpiar el texto pegado
  cleanPastedText(event: ClipboardEvent, index: number) { // Recibe el índice del control
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text');

    if (pastedText) {
      const cleanedText = pastedText.replace(/["']/g, '');
      const control = this.archivosPdfForms.controls[index] as FormControl; // Obtén el control específico
      control.setValue(cleanedText);
    }
  }

}

