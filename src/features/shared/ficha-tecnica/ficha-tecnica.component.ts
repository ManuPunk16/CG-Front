import { InputService } from './../../../core/services/input.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Input } from '../../../core/models/input.model';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

interface Duplicado {
  _id: string;
  num_oficio: string;
  folio: number;
  asignado: string;
}

interface DuplicadosResponse {
  status: string;
  duplicados: {
    num_oficio: string;
    duplicados: Duplicado[];
  }[];
}

@Component({
  selector: 'app-ficha-tecnica',
  imports: [
    NgIf,
    NgFor,
    MatCardModule,
    DatePipe,
    MatButtonModule
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

  constructor(
    private _input: InputService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
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
              this.loadPdfs();
              this.loadDuplicated();
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

  loadDuplicated() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      if (this.id) {
        this._input.getDuplicatedOficios(this.id).subscribe({
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

  loadPdfs() {
    if (this.inputDetails && this.inputDetails.archivosPdf) {
      this.inputDetails.archivosPdf.forEach(pdfPath => {
        const filename = pdfPath.substring(pdfPath.lastIndexOf('\\') + 1);
        this.pdfFilenames.push(filename);
        this._input.getPdfByIdInput(this.inputDetails._id, filename).subscribe({
          next: (blob: Blob) => {
            const urlCreator = window.URL || window.webkitURL;
            const blobUrl = urlCreator.createObjectURL(blob);
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
            this.pdfUrls.push(safeUrl);
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error obteniendo PDF:', error);
          }
        });
      });
    }

    if (this.inputDetails && this.inputDetails.seguimientos.archivosPdf_seguimiento) {
      this.inputDetails.seguimientos.archivosPdf_seguimiento.forEach(pdfPathSeguimiento => {
        const filename = pdfPathSeguimiento.substring(pdfPathSeguimiento.lastIndexOf('\\') + 1);
        this.pdfFilenamesSeguimiento.push(filename);
        this._input.getPdfByIdSeguimiento(this.inputDetails._id, filename).subscribe({
          next: (blob: Blob) => {
            const urlCreator = window.URL || window.webkitURL;
            const blobUrl = urlCreator.createObjectURL(blob);
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
            this.pdfUrlsSeguimiento.push(safeUrl);
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error obteniendo PDF:', error);
          }
        });
      });
    }
  }
}
