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
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import Swal from 'sweetalert2';

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
      fecha_respuesta: new FormControl(),
      usuario: this.fb.group({
        id: [this.currentUser.id],
        username: [this.currentUser.username]
      })
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
    if (this.seguimientoForm.valid && this.inputDetails) {
      // 1. Formatear fechas
      const formattedValues = { ...this.seguimientoForm.value }; // Crear copia para no modificar el original directamente.
      for (const key in formattedValues) {
        if (formattedValues.hasOwnProperty(key) && (key.startsWith('fecha_') || key.endsWith('_fecha'))) {
          formattedValues[key] = formattedValues[key] ? formatDate(formattedValues[key], 'yyyy-MM-ddTHH:mm:ss.SSSZ', 'en-US') : null;
        }
      }

      // 2. Crear objeto seguimientoData
      const seguimientoData = { ...this.inputDetails.seguimientos, ...formattedValues };

      // 3. Crear objeto inputData
      const inputData: Input = {
        ...this.inputDetails,
        seguimientos: seguimientoData
      };

      // 4. Llamar al servicio
      this._inputService.updateInput(this.id, inputData).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: '¡Registro editado!',
            text: 'El registro se ha editado correctamente.',
            showConfirmButton: false,
            timer: 1500
          });
          this.seguimientoForm.reset();
          this.router.navigate(['/Entradas']); // Redirige o muestra mensaje de éxito
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Algo salió mal. Por favor, inténtalo de nuevo.',
            showConfirmButton: true
          });
          // Muestra mensaje de error al usuario
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

  initForm() {
    if (this.inputDetails && this.currentUser) {
      this.seguimientoForm = this.fb.group({
        oficio_salida: [this.inputDetails.seguimientos?.oficio_salida || null, Validators.required],
        num_expediente: [this.inputDetails.seguimientos?.num_expediente || null],
        fecha_oficio_salida: [this.inputDetails.seguimientos?.fecha_oficio_salida || null],
        fecha_acuse_recibido: [this.inputDetails.seguimientos?.fecha_acuse_recibido || null, Validators.required],
        destinatario: [this.inputDetails.seguimientos?.destinatario || null, Validators.required],
        cargo: [this.inputDetails.seguimientos?.cargo || null, Validators.required],
        atencion_otorgada: [this.inputDetails.seguimientos?.atencion_otorgada || null, Validators.required],
        anexo: [this.inputDetails.seguimientos?.anexo || null],
        estatus: [this.inputDetails.estatus || null, Validators.required],
        comentarios: [this.inputDetails.seguimientos?.comentarios || null],
        firma_visado: [this.inputDetails.seguimientos?.firma_visado || null],
        archivosPdf_seguimiento: this.fb.array(this.inputDetails.seguimientos?.archivosPdf_seguimiento ? this.inputDetails.seguimientos.archivosPdf_seguimiento.map(pdf => this.fb.control(pdf)) : [], [this.archivosPdfValidator]),
        fecha_respuesta: [this.inputDetails.seguimientos?.fecha_respuesta || null],
        usuario: this.fb.group({
          id: [this.currentUser.id],
          username: [this.currentUser.username]
        })
      });
    }
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

  cleanPastedText(event: ClipboardEvent, index: number) { // Recibe el índice del control
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text');

    if (pastedText) {
      const cleanedText = pastedText.replace(/["']/g, '');
      const control = this.archivosPdf_seguimientoFromArray.controls[index] as FormControl; // Obtén el control específico
      control.setValue(cleanedText);
    }
  }
}
