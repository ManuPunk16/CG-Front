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
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import Swal from 'sweetalert2';

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
  currentUser: any;
  isLoggedIn = false;
  private roles: string[] = [];
  username?: string;
  showAdmin = false;
  showLinker = false;
  showModerator = false;

  constructor(
    private _inputService: InputService,
    private fb: FormBuilder,
    private _area: AreaService,
    private _institution: InstitutionsService,
    private _instrument: InstrumentsService,
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private _tokenStorageService: TokenStorageService
  ) {
    this.currentUser = this._tokenStorageService.getUser();
    this.inputForm = new FormGroup({
      // anio: new FormControl(),
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
      editor_user: this.fb.group({ // Agrupa create_user con fb.group
        id: [this.currentUser.id], // Asigna el ID del usuario actual
        username: [this.currentUser.username] // Asigna el username del usuario actual
      }),
    });
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
    if (this.inputForm.valid) {
      this._inputService.updateInput(this.id, this.inputForm.value).subscribe({ // Usa el servicio updateInput
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: '¡Registro editado!',
            text: 'El registro se ha editado correctamente.',
            showConfirmButton: false,
            timer: 1500
          });
          this.inputForm.reset();
          this.router.navigate(['/Entradas']); // Redirige a la lista de inputs o muestra un mensaje de éxito
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Algo salió mal. Por favor, inténtalo de nuevo.',
            showConfirmButton: true
          });
          // Muestra el mensaje de error al usuario (usando un servicio de notificaciones, por ejemplo)
        }
      });
    } else {
      Object.keys(this.inputForm.controls).forEach(key => {
        const control = this.inputForm.get(key);
        if (control?.invalid) {
          console.log(`- ${key}:`, control.errors);
        }
      });
      Swal.fire({
        icon: 'warning',
        title: 'Formulario inválido',
        text: 'Por favor, completa todos los campos requeridos.'
      });
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
    if (this.inputDetails) { // Verifica que inputDetails esté definido
      this.inputForm = this.fb.group({
        // anio: [this.inputDetails.anio, Validators.required],
        folio: [this.inputDetails.folio, Validators.required],
        num_oficio: [this.inputDetails.num_oficio || '', Validators.required],
        fecha_oficio: [this.inputDetails.fecha_oficio ? new Date(this.inputDetails.fecha_oficio) : null, Validators.required],
        fecha_vencimiento: [this.inputDetails.fecha_vencimiento ? new Date(this.inputDetails.fecha_vencimiento) : null],
        fecha_recepcion: [this.inputDetails.fecha_recepcion ? new Date(this.inputDetails.fecha_recepcion) : null, Validators.required],
        hora_recepcion: [this.inputDetails.hora_recepcion || ''],
        instrumento_juridico: [this.inputDetails.instrumento_juridico || '', Validators.required],
        remitente: [this.inputDetails.remitente || '', Validators.required],
        institucion_origen: [this.inputDetails.institucion_origen || '', Validators.required],
        asunto: [this.inputDetails.asunto || '', Validators.required],
        asignado: [this.inputDetails.asignado || '', Validators.required],
        estatus: [this.inputDetails.estatus || '', Validators.required],
        observacion: [this.inputDetails.observacion || ''],
        archivosPdf: this.fb.array(this.inputDetails.archivosPdf ? this.inputDetails.archivosPdf.map(pdf => this.fb.control(pdf)) : []),
        editor_user: this.fb.group({
          id: [this.currentUser.id],
          username: [this.currentUser.username]
        })
      });
    }
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

  salirSinGuardar() {
    if (!this.inputForm.dirty) { // Verifica si el formulario ha sido modificado
      const confirmacion = window.confirm('¿Estás seguro de que quieres salir sin guardar los cambios?');
      if (confirmacion) {
        this.router.navigate(['/Entradas']);
      }
    } else {
      this.router.navigate(['/Entradas']); // Navega directamente si no hay cambios
    }
  }

  // Función para limpiar el texto pegado
  cleanPastedText(event: ClipboardEvent, index: number) { // Recibe el índice del control
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text');

    if (pastedText) {
      const cleanedText = pastedText.replace(/["']/g, '');
      const control = this.archivosPdfFormArray.controls[index] as FormControl; // Obtén el control específico
      control.setValue(cleanedText);
    }
  }
}
