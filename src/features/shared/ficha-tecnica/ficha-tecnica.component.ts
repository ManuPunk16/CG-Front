import { InputService } from './../../../core/services/input.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Input } from '../../../core/models/input.model';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-ficha-tecnica',
  imports: [
    NgIf,
    NgFor
  ],
  standalone: true,
  templateUrl: './ficha-tecnica.component.html',
  styleUrl: './ficha-tecnica.component.scss'
})
export class FichaTecnicaComponent implements OnInit {

  // input!: Input;
  public id!: any;
  inputDetails!: Input;

  pdfUrls: SafeUrl[] = [];

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

  loadPdfs() {
    if (this.inputDetails && this.inputDetails.archivosPdf) {
      this.inputDetails.archivosPdf.forEach(pdfPath => {
        const filename = pdfPath.substring(pdfPath.lastIndexOf('\\') + 1);
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
  }
}
