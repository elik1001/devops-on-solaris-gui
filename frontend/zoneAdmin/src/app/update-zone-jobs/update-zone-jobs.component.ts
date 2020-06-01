import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { AuthService } from '../auth.service';
import { NavBarServiceService } from '../nav-bar-service.service';
import { UpdateZoneJobsService } from '../update-zone-jobs.service';
import { ZoneJob } from '../model/zoneJobsSchema';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog } from '@angular/material';
import { expandableRowAnimation } from './expandable-row.animation';

import { EditJobComponent } from './dialogs/edit-job/edit-job.component';
import { DeleteJobComponent } from './dialogs/delete-job/delete-job.component';

export interface Job {
  'longId': String;
  'id': number;
  'name': String;
  'failCount': number;
  'failReason': String;
  'failedAt': String;
  'lockedAt': String;
  'lastRunAt': String;
  'nextRunAt': String;
}

@Component({
  selector: 'app-update-zone-jobs',
  templateUrl: './update-zone-jobs.component.html',
  styleUrls: ['./update-zone-jobs.component.scss'],
  animations: [expandableRowAnimation],
})
export class UpdateZoneJobsComponent implements OnInit {

  jobList: ZoneJob[] = [];
  //selectApp: ZoneJob;

  displayedColumns: string[] = ['expand', 'name', 'failCount', 'failReason', 'failedAt',  'lockedAt', 'nextRunAt',  'actions'];
  data = Object.assign(jobList);
  dataSource = new MatTableDataSource<Job>(this.data);

  expandedElement: string = '';

  zoneJobSubscription: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    public updateZoneJobsService: UpdateZoneJobsService,
    public _authService: AuthService,
    public dialog: MatDialog,
    public globals: AppGlobals,
    private navBarServiceService: NavBarServiceService,
  ) { }

  getJobs() {
    this.data.splice(0);
    this.jobList.splice(0);
    this.zoneJobSubscription = this.updateZoneJobsService.getZoneJobs(this.globals.getEnvironment('baseUrl'))
      .subscribe((jobs: ZoneJob[]) => {

        for (let i = 0; i < jobs['message'].length; i++) {
          jobList[i] = jobs['message'][i];
        }
        localStorage.setItem('token', jobs['token']);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
  }

  updateZoneJob(i: number, _id: string, name: string, nextRunAt: string, failCount: number) {
    const dialogRef = this.dialog.open(EditJobComponent, {
      data: {
        _id: _id,
        name: name,
        nextRunAt: nextRunAt,
        failCount: failCount
      }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result === 1) {
        const index = this.data.findIndex(item => item._id === _id);
        this.data[index] = this.updateZoneJobsService.getDialogData();
        this.data.splice(0);
        this.jobList.splice(0);
        this.getJobs();
        this.refreshTable();
      }
    });
  }

  deleteZoneJob(i: number, _id: number, name: string, lastRunAt: string, failCount: number) {
    const dialogRef = this.dialog.open(DeleteJobComponent, {
      data: {
        _id: _id,
        name: name,
        lastRunAt: lastRunAt,
        failCount: failCount
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        let index: number = this.data.findIndex(d => _id === _id);
        this.data.splice(index, 1);
        this.getJobs();
        this.refreshTable();
      }
    });

  }

  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
    // this.dataSource.paginator = this.paginator;
  }

  ngOnInit() {
    this.getJobs();
    this.navBarServiceService.changeMessage("Zone Jobs");
  }

  toggleExpandableSymbol(_id: string): void {
    this.expandedElement = this.expandedElement === _id
      ? ''
      : _id;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngOnDestroy(): void {
    this.zoneJobSubscription.unsubscribe();
  }


}
let jobList: Job[] = [];
