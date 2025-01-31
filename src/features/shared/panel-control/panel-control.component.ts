import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-panel-control',
  imports: [
    MatCardModule,
    MatTableModule
  ],
  standalone: true,
  templateUrl: './panel-control.component.html',
  styleUrl: './panel-control.component.scss'
})
export class PanelControlComponent implements OnInit {

  constructor() {

  }

  ngOnInit(): void {

  }

}
