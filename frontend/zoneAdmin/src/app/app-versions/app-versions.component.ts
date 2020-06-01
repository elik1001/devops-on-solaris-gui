import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { AuthService } from '../auth.service';
import { NavBarServiceService } from '../nav-bar-service.service';
import { AppVersionsService } from '../app-versions.service';
import { AppVersions } from '../model/appVersionsSchema';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog } from '@angular/material';
import { expandableRowAnimation } from './expandable-row.animation';

import { AddAppVersionsComponent } from './dialogs/add-app-versions/add-app-versions.component';
import { EditAppVersionsComponent } from './dialogs/edit-app-versions/edit-app-versions.component';
import { DeleteAppVersionsComponent } from './dialogs/delete-app-versions/delete-app-versions.component';

export interface App {
  'longId': String;
  'id': number;
  'appName': String;
  'lastVersion': String;
  'defaultVersion': String;
}

@Component({
  selector: 'app-app-versions',
  templateUrl: './app-versions.component.html',
  styleUrls: ['./app-versions.component.scss'],
  animations: [expandableRowAnimation],
})
export class AppVersionsComponent implements OnInit {
  appList: AppVersions[] = [];
  selectApp: AppVersions;
  toggleForm: boolean;
  emp_status: any = 'Active';
  readAccess = true;

  displayedColumns: string[] = ['expand', 'id', 'appName', 'lastVersion', 'defaultVersion', 'actions'];
  data = Object.assign(appList);
  dataSource = new MatTableDataSource<App>(this.data);
  expandedElement: string = '';

  adminSubscription: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    public appVersionsService: AppVersionsService,
    public _authService: AuthService,
    public dialog: MatDialog,
    public globals: AppGlobals,
    private navBarServiceService: NavBarServiceService,
  ) { }

  getApps() {

    this.adminSubscription = this.appVersionsService.getAppList(this.globals.getEnvironment('baseUrl'))
      .subscribe((apps: AppVersions[]) => {
        for (let i = 0; i < apps['message'].length; i++) {
          if (typeof apps['message'][i]['isActive'] == 'undefined') {
            this.emp_status = 'Disabled';
          } else {
            this.emp_status = apps['message'][i]['isActive'];
          }
          appList[i] = {
            'longId': apps['message'][i]['_id'],
            "id": i + 1,
            "appName": apps['message'][i]['appName'],
            "lastVersion": apps['message'][i]['lastVersion'],
            "defaultVersion": apps['message'][i]['defaultVersion'],
          }
        }
        localStorage.setItem('token', apps['token'])
        // console.log(appList);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
  }

  addApp(app: App) {
    const dialogRef = this.dialog.open(AddAppVersionsComponent, {
      data: { app: app }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        this.getApps();
        this.refreshTable();
      }
    });
  }

  public getColor(user_status: string): string{
     return user_status === 'Active' ? "green" : "gray";
  }


  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
    // this.dataSource.paginator = this.paginator;
  }

  deleteApps(i: number, _id: string, id: number, appName: string, lastVersion: string, defaultVersion: string) {
    const dialogRef = this.dialog.open(DeleteAppVersionsComponent, {
      data: {
        _id: _id,
        id: id,
        appName: appName,
        lastVersion: lastVersion,
        defaultVersion: defaultVersion,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        let index: number = this.data.findIndex(d => _id === _id);
        this.data.splice(index, 1);
        this.getApps();
        this.refreshTable();
      }
    });

  }

  editApps(i: number, _id: string, id: number, appName: string, lastVersion: string, defaultVersion: string) {
    const dialogRef = this.dialog.open(EditAppVersionsComponent, {
      data: {
        _id: _id,
        id: id,
        appName: appName,
        lastVersion: lastVersion,
        defaultVersion: defaultVersion,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        const index = this.data.findIndex(item => item.longId === _id);
        this.data[index] = this.appVersionsService.getDialogData();
        this.getApps();
        this.refreshTable();
      }
    });
  }

  ngOnInit() {
    if (this.globals.getCurrentRole() === 'Admin') {
      this.readAccess = false;
    }

    this.getApps();
    this.navBarServiceService.changeMessage("Application Versions");
  }

  toggleExpandableSymbol(longId: string): void {
    this.expandedElement = this.expandedElement === longId
      ? ''
      : longId;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngOnDestroy(): void {
    this.adminSubscription.unsubscribe();
  }

}

let appList: App[] = [];
