import { InputService } from './../../../core/services/input.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Input } from '../../../core/models/input.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { concatMap, map, of } from 'rxjs';

interface Duplicado {
  _id: string;
  num_oficio: string;
  folio: number;
  asignado: string;
  fecha_recepcion?: string;
}

interface DuplicadosResponse {
  status: string;
  duplicados: {
    num_oficio: string;
    duplicados: Duplicado[];
  }[];
}

interface TiempoRespuesta {
  _id: string;
  num_oficio: string;
  tiempo_recepcion: Date;
  tiempo_respuesta: Date;
  asignado: string;
  diferencia_milisegundos: number;
  diferencia_dias: number;
}

@Component({
  selector: 'app-ficha-tecnica',
  imports: [
    NgIf,
    NgFor,
    MatCardModule,
    DatePipe,
    MatButtonModule,
    RouterModule
  ],
  standalone: true,
  templateUrl: './ficha-tecnica.component.html',
  styleUrl: './ficha-tecnica.component.scss'
})
export class FichaTecnicaComponent implements OnInit {

  // input!: Input;
  public id!: any;
  duplicados: { num_oficio: string; duplicados: Duplicado[] }[] | null = null;
  loading: boolean = true;
  inputDetails!: Input;

  pdfUrls: SafeUrl[] = [];
  pdfUrlsSeguimiento: SafeUrl[] = [];
  pdfFilenames: string[] = [];
  pdfFilenamesSeguimiento: string[] = [];

  errorPdfEntrada: string | null = null;
  errorPdfSeguimiento: string | null = null;
  pdfsCargados: boolean = false;

  tiempoRespuesta: TiempoRespuesta | null = null;
  error: string | null = null;

  constructor(
    private _input: InputService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private _tokenStorage: TokenStorageService,
    private router: Router,
    private _reportes: ReportesService
  ) {

  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        this._input.getInputById(this.id).subscribe({
          next: (res: any) => {
            if (res.input) {
              this.inputDetails = res.input;
              // console.log(this.inputDetails);
              this.loadPdfs();
              this.cdr.detectChanges();
            } else {
              console.error("No se encontraron datos del input.");
            }
          },
          error: err => {
            console.log(err);
          }
        });
        const user = this._tokenStorage.getUser();
        if (user.roles.includes('ROLE_ADMIN') || user.roles.includes('ROLE_MODERATOR')) {
          this.loadDuplicated();
        } else {
          this.loadDuplicatedByNormalUsers();
        }
      }
    });

    this.loadCalcularTiemposRespuestaPorId();
  }

  loadCalcularTiemposRespuestaPorId() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        this._reportes.getTiempoRespuestaPorId(this.id).subscribe({
          next: (data: TiempoRespuesta) => {
            this.tiempoRespuesta = data;
            this.tiempoRespuesta.diferencia_dias = Math.floor(data.diferencia_dias);
            // console.log(this.tiempoRespuesta);
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.error = error.message;
            console.error("Error desde el componente:", error);
          }
        });
      }
    });
  }

  loadDuplicated() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        this._input.getDuplicatedOficios(this.id).subscribe({
          next: (res: DuplicadosResponse) => {
            this.loading = false;
            this.duplicados = (res && res.duplicados && res.duplicados.length > 0) ? res.duplicados : null; // Asignación condicional
            this.cdr.detectChanges();
          },
          error: err => {
            this.loading = false;
            console.error(err);
            this.duplicados = null;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  loadDuplicatedByNormalUsers() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        const user = this._tokenStorage.getUser();
        const areaUser = user.area;
        this._input.getDuplicatedOficiosByNormalUsers(this.id, areaUser).subscribe({
          next: (res: DuplicadosResponse) => {
            this.loading = false;
            if (res && res.duplicados && res.duplicados.length > 0) {
              this.duplicados = res.duplicados;
              this.cdr.detectChanges();
            } else {
              this.duplicados = null;
              console.log("No hay nada");
            }
          },
          error: err => {
            this.loading = false;
            console.error(err);
            this.duplicados = null;
          }
        });
      }
    });
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  loadPdfs() {
    this.pdfUrls = [];
    this.pdfUrlsSeguimiento = [];
    this.pdfFilenames = [];
    this.pdfFilenamesSeguimiento = [];
    this.errorPdfEntrada = null;
    this.errorPdfSeguimiento = null;

    if (this.inputDetails && this.inputDetails.archivosPdf) {
      of(...this.inputDetails.archivosPdf).pipe(
          concatMap((pdfPath, index) => {
              const filename = pdfPath.substring(pdfPath.lastIndexOf('\\') + 1);
              this.pdfFilenames.push(filename);

              return this._input.getPdfByIdInput(this.inputDetails._id, filename).pipe(
                  map((blob: Blob) => ({ blob, index, filename }))
              );
          })
      ).subscribe({
          next: ({ blob, index, filename }) => {
              const urlCreator = window.URL || window.webkitURL;
              const blobUrl = urlCreator.createObjectURL(blob);
              const safeUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
              this.pdfUrls[index] = safeUrl;

              if (index === this.inputDetails.archivosPdf.length - 1) {
                  this.pdfsCargados = true;
              }
              this.cdr.detectChanges();
          },
          error: (error: Error) => {
            console.error('Error obteniendo PDF:', error); // Incluir filename en el error
            this.errorPdfEntrada = "Error al cargar " + ". Verificar nombre de archivo."; // Mensaje de error específico
            this.cdr.detectChanges();
          }
      });
    }

    // if (this.inputDetails && this.inputDetails.archivosPdf) {
    //     this.inputDetails.archivosPdf.forEach((pdfPath, index) => { // Agregar index
    //         const filename = pdfPath.substring(pdfPath.lastIndexOf('\\') + 1);
    //         this.pdfFilenames.push(filename);

    //         this._input.getPdfByIdInput(this.inputDetails._id, filename).subscribe({
    //             next: (blob: Blob) => {
    //                 const urlCreator = window.URL || window.webkitURL;
    //                 const blobUrl = urlCreator.createObjectURL(blob);
    //                 const safeUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
    //                 this.pdfUrls[index] = safeUrl; // Usar index para asignar la URL correcta
    //                 if (index === this.inputDetails.archivosPdf.length - 1) { // <-- Verificar si es el último PDF
    //                   this.pdfsCargados = true;
    //                 }
    //                 this.cdr.detectChanges();
    //             },
    //             error: (error: Error) => {
    //                 console.error('Error obteniendo PDF:', error, filename); // Incluir filename en el error
    //                 this.errorPdfEntrada = "Error al cargar " + filename + ". Verificar nombre de archivo."; // Mensaje de error específico
    //                 this.cdr.detectChanges();
    //             }
    //         });
    //     });
    // }

    // if (this.inputDetails && this.inputDetails.seguimientos && this.inputDetails.seguimientos.archivosPdf_seguimiento) {
    //     this.inputDetails.seguimientos.archivosPdf_seguimiento.forEach((pdfPathSeguimiento, index) => { // Agregar index
    //         const filename = pdfPathSeguimiento.substring(pdfPathSeguimiento.lastIndexOf('\\') + 1);
    //         this.pdfFilenamesSeguimiento.push(filename);

    //         this._input.getPdfByIdSeguimiento(this.inputDetails._id, filename).subscribe({
    //             next: (blob: Blob) => {
    //                 const urlCreator = window.URL || window.webkitURL;
    //                 const blobUrl = urlCreator.createObjectURL(blob);
    //                 const safeUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
    //                 this.pdfUrlsSeguimiento[index] = safeUrl; // Usar index para asignar la URL correcta
    //                 if (index === this.inputDetails.archivosPdf.length - 1) { // <-- Verificar si es el último PDF
    //                   this.pdfsCargados = true;
    //                 }
    //                 this.cdr.detectChanges();
    //             },
    //             error: (error: Error) => {
    //                 console.error('Error obteniendo PDF de seguimiento:', error, filename); // Incluir filename en el error
    //                 this.errorPdfSeguimiento = "Error al cargar " + filename + ". Verificar nombre de archivo."; // Mensaje de error específico
    //                 this.cdr.detectChanges();
    //             }
    //         });
    //     });
    // }

    if (this.inputDetails && this.inputDetails.seguimientos && this.inputDetails.seguimientos.archivosPdf_seguimiento) {
      of(...this.inputDetails.seguimientos.archivosPdf_seguimiento).pipe(
          concatMap((pdfPathSeguimiento, index) => {
              const filename = pdfPathSeguimiento.substring(pdfPathSeguimiento.lastIndexOf('\\') + 1);
              this.pdfFilenamesSeguimiento.push(filename);

              return this._input.getPdfByIdSeguimiento(this.inputDetails._id, filename).pipe(
                  map((blob: Blob) => ({ blob, index, filename }))
              );
          })
      ).subscribe({
          next: ({ blob, index, filename }) => {
              const urlCreator = window.URL || window.webkitURL;
              const blobUrl = urlCreator.createObjectURL(blob);
              const safeUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
              this.pdfUrlsSeguimiento[index] = safeUrl;

              if (index === this.inputDetails.seguimientos.archivosPdf_seguimiento.length - 1) {
                  this.pdfsCargados = true;
              }
              this.cdr.detectChanges();
          },
          error: (error: Error) => {
              console.error('Error obteniendo PDF de seguimiento:', error);
              this.errorPdfSeguimiento = "Error al cargar " + ". Verificar nombre de archivo.";
              this.cdr.detectChanges();
          }
      });
    }
  }
}
