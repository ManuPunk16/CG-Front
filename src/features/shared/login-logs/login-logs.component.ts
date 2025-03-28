import { Component, OnInit, ViewChild } from '@angular/core';
import { LogService } from '../../../core/services/log.service';
import { LoginLog } from '../../../core/models/login-log.model';
import { CommonModule, DatePipe, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-login-logs',
  imports: [
    DatePipe,
    NgFor,
    CommonModule,
    FormsModule,
    MatPaginatorModule
  ],
  standalone: true,
  templateUrl: './login-logs.component.html',
  styleUrls: ['./login-logs.component.scss']
})
export class LoginLogsComponent implements OnInit {
  userLogs: LoginLog[] = [];
  allLogs: LoginLog[] = [];
  isAdmin = false;

  logsFiltrados: LoginLog[] = [];
  nombreFilter: string = '';

  pageSize = 10;
  pageIndex = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private logService: LogService) {}

  ngOnInit(): void {
    // this.loadUserLogs();
    this.loadAllLogs();
  }

  loadUserLogs(): void {
    this.logService.getUserLoginLogs().subscribe({
      next: (logs) => {
        this.userLogs = logs;
        this.aplicarFiltro();
      },
      error: (error) => {
        console.error('Error al cargar los logs del usuario:', error);
      }
    });
  }

  loadAllLogs(): void {
    this.logService.getAllLoginLogs().subscribe({
      next: (logs) => {
        this.allLogs = logs;
      },
      error: (error) => {
        console.error('Error al cargar todos los logs:', error);
      }
    });
  }

  aplicarFiltro(): void {
    if (!this.nombreFilter) {
      this.logsFiltrados = [...this.allLogs];
    } else {
      this.logsFiltrados = this.allLogs.filter(log =>
        log.userName.toLowerCase().includes(this.nombreFilter.toLowerCase())
      );
    }
    this.pageIndex = 0; // Reset page index when filter changes
    this.paginator?.firstPage(); // Reset paginator to first page
  }

  get pagedLogs(): LoginLog[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.logsFiltrados.slice(startIndex, startIndex + this.pageSize);
  }

  pageChanged(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
