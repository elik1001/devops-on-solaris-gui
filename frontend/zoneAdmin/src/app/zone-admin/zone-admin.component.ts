import { Component, ElementRef, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { AuthService } from '../auth.service';
import { ZoneService } from '../zone.service';
import { NavBarServiceService } from '../nav-bar-service.service';
import { Zone } from '../model/zoneSchema';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog, MatTable, MatTooltip } from '@angular/material';
import { Subscription, merge, of as observableOf, fromEvent, interval, Observable, BehaviorSubject } from 'rxjs';
import { catchError, map, startWith, switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {animate, state, style, transition, trigger} from '@angular/animations';
//import { expandableRowAnimation } from './expandable-row.animation';

import { AddZoneComponent } from './dialogs/add-zone/add-zone.component';
import { DeleteZoneComponent } from './dialogs/delete-zone/delete-zone.component';
import { EditZoneComponent } from './dialogs/edit-zone/edit-zone.component';
import { RefreshZoneComponent } from './dialogs/refresh-zone/refresh-zone.component';
import { ScheduleZoneComponent } from './dialogs/schedule-zone/schedule-zone.component';

export interface Element {
  'longId': String;
  '_id': String;
  'id': number;
  'zoneLock': String;
  'zoneID': String;
  'zonePort': number;
  'zoneUser': String;
  'zoneType': String;
  'zoneShortName': String;
  'activeSchema': Boolean;
  'zoneName': String;
  'zoneServer': String;
  'zoneActive': String;
  'zoneAddress': String;
  'buildStatus': String;
  'buildMsg': String;
  'dbVer': number;
  'appsVer': number;
  'appVersions': [];
  'dbVersions': [];
  'zoneDescription': String;
  'zoneMaint': Boolean;
  'percentComplete': number;
}

let intervalTimer: any;
@Component({
  selector: 'app-zone-admin',
  templateUrl: './zone-admin.component.html',
  styleUrls: ['./zone-admin.component.scss'],
  //animations: [expandableRowAnimation],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})

export class ZoneAdminComponent implements OnInit, AfterViewInit {

  refreshTokenSub: Subscription;
  zoneStatsSub: Subscription;

  public expandIcon = 'keyboard_arrow_right';
  zoneList: Zone[] = [];
  selectZone: Zone;
  toggleForm: boolean;
  zoneSubscription: any;
  power_zone: string;

  displayedColumns: string[] = ['expand', 'zoneID', 'zoneMaint', 'buildStatus', 'zoneLock', 'zonePort', 'zoneUser', 'zoneType', 'activeSchema', 'zoneShortName', 'zoneServer', 'zoneActive', 'buildMsg', 'actions'];
  data = Object.assign(zoneList);
  //dataSource = new MatTableDataSource<Element>(this.data);
  dataSource = new MatTableDataSource<Element>(Object.assign(zoneList));
  isExpansionDetailRow = (index, row) => row.hasOwnProperty('detailRow');

  // dataSource: MatTableDataSource<Element>;
  expandedElementSymb: string = '';
  expandedElement: Element | null;

  isChecked: boolean = true;
  curentFilter: string = this.globals.getCurrentUser();
  curentSearchUser: string = this.globals.getCurrentUser();
  searchField: string = 'zoneUser';
  resultsLength = 0;
  isLoadingResults = true;
  isLoadingCpuResults = true;
  zoneHalt: any = [
    {
      'haltRemoteHost': 'DC1',
      'haltErrResult': 'Working... please wait..',
      'haltActionResultsIcon': 'fa fa-minus neutral-icon',
      'haltOperation': ' Halt'
    },
    {
      'haltRemoteHost': 'DC2',
      'haltErrResult': 'Working... please wait..',
      'haltActionResultsIcon': 'fa fa-minus neutral-icon',
      'haltOperation': ' Halt'
    }
  ]
  stateActionResultsIcon: string;;
  zoneApiAddr: string = '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone?_rad_detail';
  zoneStarting: boolean[] = [];

  zoneStats: any;
  myZones: any;
  selectDB: any;
  myZonesChecked: boolean = true;
  selectDBChecked: boolean = false;
  jiraDescription: any;
  refresh_value = 0;
  intervalTimer: any;
  percentComplete: number = 0;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('searchIinput') input: ElementRef;
  // @ViewChild('zoneTable') zoneTable: MatTable<any>;
  @ViewChild('filter') filter: ElementRef;

  @ViewChild('jiraTooltip') jiraTooltip: MatTooltip;

  constructor(
    public _authService: AuthService,
    private zoneService: ZoneService,
    public dialog: MatDialog,
    private toastrService: ToastrService,
    public globals: AppGlobals,
    private navBarServiceService: NavBarServiceService,
  ) {
    //this.jiraDescription = 'jiraDescription';
  }

  ngOnInit() {
    this.refreshTokenSub = this.zoneService.refreshToken(this.globals.getEnvironment('baseUrl'))
      .subscribe(data => {
        localStorage.setItem('token', data['token']);
      });
    this.navBarServiceService.changeMessage("Zone Administration");

    const inter = interval(60000);
    this.zoneStatsSub = inter.pipe(
      startWith(0),
      switchMap(() => this.zoneService.getZoneStat(this.globals.getEnvironment('baseUrl')))
    ).subscribe(stats => {
      //this.isLoadingCpuResults = true;
      // localStorage.setItem('token', stats['token']);
      this.zoneStats = stats['message'];
      this.isLoadingCpuResults = false;
    });
  }

  refresh(refreshTime) {
    intervalTimer = setInterval(() => {
      this.refreshTable();
    }, refreshTime);
  }

  updateRefreshTime(refreshTime) {
    if (refreshTime < 10) {
      this.refresh_value = 0;
      clearInterval(intervalTimer);
    } else {
      clearInterval(intervalTimer);
      refreshTime = refreshTime * 1000;
      this.refresh(refreshTime);
    }
  }


  searchUser(event, targetType) {

    if (targetType === 'selectDB') {
      this.myZonesChecked = false;
      this.selectDBChecked = true;
      if (event.checked === true) {
        this.curentFilter = 'DB';
        this.searchField = 'zoneType';
        this.loadZonePage();
      } else {
        this.curentFilter = undefined;
        this.searchField = undefined;
        this.loadZonePage();
      }
    } else if (targetType === 'myZones') {
      this.myZonesChecked = true;
      this.selectDBChecked = false;
      if (event.checked === true) {
        this.curentFilter = this.globals.getCurrentUser();
        this.searchField = 'zoneUser';
        this.loadZonePage();
      } else {
        this.curentFilter = undefined;
        this.searchField = undefined;
        this.loadZonePage();
      }
    }
  }

  ngAfterViewInit() {
    //this.data = Object.assign(zoneList);
    //this.dataSource = new MatTableDataSource<Element>(this.data);
    this.dataSource = new MatTableDataSource<Element>(Object.assign(zoneList));
    this.getZones()

    fromEvent(this.input.nativeElement, 'keyup')
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap(() => {
          this.stateActionResultsIcon = '';
          this.paginator.pageIndex = 0;
          this.loadZonePage();
        })
      ).subscribe();

    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    // this.paginator._changePageSize(this.paginator.pageSize);
  }

  toggleExpandableSymbol(_id): void {
    this.expandedElementSymb = this.expandedElementSymb === _id
      ? ''
      : _id;
  }

  getZones() {
    this.zoneSubscription = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.zoneService!.getZoneList(
            this.globals.getEnvironment('baseUrl'),
            this.sort.active,
            '',
            this.sort.direction,
            this.paginator.pageIndex + 1,
            this.paginator.pageSize,
            this.globals.getEnvironment('dc1Hosts'),
            this.zoneApiAddr,
            this.curentFilter,
            this.searchField
          );
        }),
        map(data => {
          this.isLoadingResults = false;
          this.resultsLength = data['message'][0]['pages'];
          localStorage.setItem('token', data['token']);

          return data['message'][0]['message'];
        }),
        catchError(() => {
          this.isLoadingResults = false;
          return observableOf([]);
        })
      ).subscribe(data => this.data = data);
  }

  addZone(zone: Zone) {
    const dialogRef = this.dialog.open(AddZoneComponent, {
      data: { zone: zone }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (typeof result !== 'undefined') {
        this.zoneService.addZone(this.globals.getEnvironment('baseUrl'), result)
          .subscribe(createResults => {
            //console.log(createResults);
            this.toastrService.success('===== BETA =====<br>Job ID:<br> ' + result['zoneName'] + '<br><br>Please wait for the build process to complete...', 'Job submitted successfully:', {
              timeOut: 5000,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
            if (createResults['createRes'] === 1) {
              // this.getZones()
              this.refreshTable();
            }
          });
      }
    });
  }

  zoneCalendar(zoneType, zoneName, zoneShortName, zoneServer, zonePort) {
    const dialogRef = this.dialog.open(ScheduleZoneComponent, {
      closeOnNavigation: true,
      data: {
        'zoneUser': this.globals.getCurrentUser(),
        'zoneType': zoneType,
        'zoneName': zoneName,
        'zoneShortName': zoneShortName,
        'zoneServer': zoneServer,
        'zonePort': zonePort,
      }
    });
    dialogRef.afterClosed().subscribe(svcAction => {

      if (typeof svcAction !== 'undefined') {
        this.zoneService.smfMaint(this.globals.getEnvironment('baseUrl'), svcAction)
          .subscribe(results => {

            this.toastrService.success('===== BETA ===== <br><br> SMF service: <br>' + svcAction['smfInst'] + '<br>Action: '+ svcAction['methudAction'] + '<br>Submitted successfully.', ' Job submitted successfully.', {
              timeOut: 5000,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
            /*if (results['createRes'] === 1) {
              this.refreshTable();
            }*/
          });
      }
    });
  }

  refreshAll(zoneType, zoneName, zoneShortName, zoneServer, zonePort, dbVer, appsVer) {
    const dialogRef = this.dialog.open(RefreshZoneComponent, {
      closeOnNavigation: true,
      data: {
        'zoneUser': this.globals.getCurrentUser(),
        'zoneType': zoneType,
        'zoneName': zoneName,
        'zoneShortName': zoneShortName,
        'zoneServer': zoneServer,
        'zonePort': zonePort,
        'dbVer': dbVer,
        'appsVer': appsVer,
      }
    });

    dialogRef.afterClosed().subscribe(svcAction => {
      if (typeof svcAction !== 'undefined') {
        // console.log(refreshReq);

        this.zoneService.refreshZone(this.globals.getEnvironment('baseUrl'), svcAction)
          .subscribe(createResults => {
            this.toastrService.success('===== BETA ===== <br><br>Please wait for the sync process to complete...', 'Sync submitted successful:', {
              timeOut: 5000,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
            if (createResults['createRes'] === 1) {
              this.refreshTable();
            }
          });
      }
    });
  }

  public getPowerColor(zone_status: string): string {
    if (zone_status === 'running') {
      //this.power_zone = 'Power off zone';
      return 'red';
    } else if (zone_status === 'installed') {
      //this.power_zone = 'Power on zone';
      return 'green';
    } else {
      //this.power_zone = 'Power state unknown';
      return 'gray';
    }
  }

  public getColor(zone_status: string): string {
    if ((zone_status === 'running') || (zone_status === 'lock_open')) {
      return 'green'
    } else if ((zone_status === 'ERROR') || (zone_status === 'lock_outlined')) {
      return 'red'
    } else if (zone_status === 'building') {
      //this.power_zone = 'Power on zone';
      return 'purple';
    } else {
      return 'gray'
    }
  }

  // not in use
  public jiraLink(jiraLink): boolean {
    //console.log(jiraLink);
    if (jiraLink.includes('UNX-')) {
      return true;
    } else {
      return false;
    }
  }

  public refreshTable() {
    this.data.sort = this.sort;
    this.paginator._changePageSize(this.paginator.pageSize);
    this.data.paginator = this.paginator;

    //this.zoneTable.renderRows();
    //this.data.renderRows();
  }

  deleteZone(i: number, _id: string, id: number, zoneLock: string, zonePort: number, zoneUser: string, zoneType: string, zoneName: string, zoneShortName: string, activeSchema: boolean, zoneServer: string, zoneActive: string, zoneUuid: string, jiraID: string, appsVer, dbVer) {
    if (zoneLock === 'lock_open') {
    const dialogRef = this.dialog.open(DeleteZoneComponent, {
      disableClose: true,
      closeOnNavigation: true,
      data: {
        _id: _id,
        id: id,
        zoneLock: zoneLock,
        zonePort: zonePort,
        zoneUser: zoneUser,
        zoneType: zoneType,
        zoneName: zoneName,
        zoneShortName: zoneShortName,
        activeSchema: activeSchema,
        zoneServer: zoneServer,
        zoneUuid: zoneUuid,
        jiraID: jiraID,
        appsVer: appsVer,
        dbVer: dbVer,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.input.nativeElement.value = "";
        let index: number = this.data.findIndex(d => _id === _id);
        this.data.splice(index, 1);
        this.refreshTable();
      }
    });
  } else {
    this.toastrService.warning('Cannot delete zone in locked state.', 'Error deleting ' + zoneShortName + '!', {
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      enableHtml: true
    });
  }
  }

  editZone(i: number, _id: string, id: number, zoneLock: string, zonePort: number, zoneUser: string, zoneType: string, zoneName: string, zoneShortName: string, activeSchema: boolean, zoneServer: string, zoneActive: string, zoneUuid: string, dbVer: number, appsVer: number, zoneDescription: string, zoneMaint: boolean) {
    const dialogRef = this.dialog.open(EditZoneComponent, {
      data: {
        _id: _id,
        id: id,
        zoneLock: zoneLock,
        zonePort: zonePort,
        zoneUser: zoneUser,
        zoneType: zoneType,
        zoneName: zoneName,
        zoneShortName: zoneShortName,
        activeSchema: activeSchema,
        zoneServer: zoneServer,
        zoneActive: zoneActive,
        zoneUuid: zoneUuid,
        dbVer: dbVer,
        appsVer: appsVer,
        zoneDescription: zoneDescription,
        zoneMaint: zoneMaint
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        //const index = this.data.findIndex(item => item.zoneUuid === zoneUuid);
        const index = this.data.findIndex(item => item._id === _id);
        this.data[index] = this.zoneService.getDialogData();
        // this.getZones()
        this.refreshTable();
      }
    });
  }

  updateRowData(row_obj, rowID, action, updateStat) {
    const foundIndex = this.data.findIndex(row_obj => row_obj._id === rowID);
    if (updateStat === 'update') {
      this.data[foundIndex]['buildStatus'] = 'fa fa-spinner fa-pulse updating-icon';
    } else {
      this.data[foundIndex]['buildStatus'] = 'fa fa-check positive-icon';
      this.data[foundIndex]['zoneActive'] = action;
    }
  }

  powerOnOff(rowIndex, row_obj, rowID, buildStatus: string, zoneName: string, zoneServer: string, zoneActive: string, action: string) {

    this.updateRowData(row_obj, rowID, zoneActive, 'update');

    if (zoneActive === 'installed') {
      this.toastrService.success(zoneName, 'Powering On Zone:', {
        timeOut: 3000,
        positionClass: 'toast-bottom-right',
        enableHtml: true
      });
      this.zonePower(zoneName, zoneServer, 'boot').then(haltRes => {
        this.updateRowData(row_obj, rowID, 'running', 'done');
        this.toastrService.success(zoneName, 'Successfully Powered On:', {
          timeOut: 3000,
          positionClass: 'toast-bottom-right',
          enableHtml: true
        });
        //this.refreshTable();
      });
    } else if (zoneActive === 'running') {
      if (action === 'reboot') {
        this.toastrService.success(zoneName, 'Rebooting Zone:', {
          timeOut: 3000,
          positionClass: 'toast-bottom-right',
          enableHtml: true
        });
        this.zonePower(zoneName, zoneServer, 'reboot').then(haltRes => {
          this.updateRowData(row_obj, rowID, 'running', 'done');
          this.toastrService.success(zoneName, 'Successfully Rebooted:', {
            timeOut: 3000,
            positionClass: 'toast-bottom-right',
            enableHtml: true
          });
          //this.refreshTable();
        });
      } else {
        this.toastrService.success(zoneName, 'Powering Off Zone:', {
          timeOut: 3000,
          positionClass: 'toast-bottom-right',
          enableHtml: true
        });
        this.zonePower(zoneName, zoneServer, 'halt').then(haltRes => {
          this.updateRowData(row_obj, rowID, 'installed', 'done');
          this.toastrService.success(zoneName, 'Successfully Powered Off:', {
            timeOut: 3000,
            positionClass: 'toast-bottom-right',
            enableHtml: true
          });
          //this.refreshTable();
        });
      }
    }
  }

  zonePower(zoneName, zoneServer, methudAction) {
    return new Promise(resolve => {
      const data = {
        '_id': this.data._id,
        'dcHost': zoneServer.split('-')[1],
        'zoneName': zoneName,
        'zfsApiType': 'PUT',
        'zfsSrcFs': 'apps1-prod_v-' + '3',
        'zfsSrcSnap': '',
        'requestUri': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + zoneName,
        'methudAction': methudAction,
        'reqBody': {}
      }
      this.zoneService.uninstallDeleteZoneCfg(this.globals.getEnvironment('baseUrl'), data)
        .subscribe(haltRes => {
          this.zoneHalt.splice(0);
          haltRes['message'].forEach(
            element => {
              //this.zoneHalt['haltOperation'] = 'Halt';
              if (element['errResult'] === false) {
                if (element['msgResp']['stderr'] === null) {
                  //console.log(element['remoteHost']);
                  let dcStat = {
                    'haltRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'haltErrResult': 'success',
                    'haltActionResultsIcon': 'fa fa-check positive-icon',
                    'haltOperation': ' Halt',
                  }
                  this.zoneHalt.push(dcStat);
                  if (this.zoneHalt.length === 2) {
                    resolve(data);
                  }
                } else {
                  let dcStat = {
                    'haltRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                    'haltErrResult': element['msgResp']['stderr'],
                    'haltActionResultsIcon': 'fa fa-circle neutral-icon',
                    'haltOperation': ' Halt',
                  }
                  this.zoneHalt.push(dcStat);
                  if (this.zoneHalt.length === 2) {
                    resolve(data);
                  }
                }
              } else {
                let dcStat = {
                  'haltRemoteHost': element['remoteHost'].split('/').join(':').split('-').join(':').split(':')[3],
                  'haltErrResult': element['msgResp']['stderr'],
                  'haltActionResultsIcon': 'fa fa-times negative-icon',
                  'haltOperation': ' Halt',
                }
                this.zoneHalt.push(dcStat);
                if (this.zoneHalt.length === 2) {
                  resolve(data);
                }
              }
            });
        });
    });
  }

  loadZonePage() {
    this.zoneSubscription = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.zoneService!.getZoneList(
            this.globals.getEnvironment('baseUrl'),
            this.sort.active,
            this.input.nativeElement.value,
            this.sort.direction,
            this.paginator.pageIndex + 1,
            this.paginator.pageSize,
            this.globals.getEnvironment('dc1Hosts'),
            this.zoneApiAddr,
            this.curentFilter,
            this.searchField
          );
        }),
        map(data => {
          this.isLoadingResults = false;
          this.resultsLength = data['message'][0]['pages'];
          localStorage.setItem('token', data['token'])

          return data['message'][0]['message'];
        }),
        catchError(() => {
          this.isLoadingResults = false;
          return observableOf([]);
        })
      ).subscribe(data => this.data = data);

  }

  getJiraDescription(zoneShortName: string, jiraID: string) {
    if (zoneShortName || jiraID) {
      const jiraDisc = {
        'zoneShortName': zoneShortName,
        'jiraID': jiraID
      }
      //this.jiraDescription = '';
      this.zoneService.getJiraDisc(this.globals.getEnvironment('baseUrl'), jiraDisc)
        .pipe()
        .subscribe(results => {
          //console.log(results['jiraDescription'][0]['msgResp']);
          if (results['jiraDescription'][0]['errResult'] !== true && results['jiraDescription'][0]['msgResp'] !== 'undefined') {
            this.jiraDescription = results['jiraDescription'][0]['msgResp'].toString();
            //this.jiraTooltip.show();
          } else {
            this.jiraDescription = '';
          }
        });
    } else {
      this.jiraDescription = '';
    }
  }

  ngOnDestroy(): void {
    clearInterval(intervalTimer);
    if (this.zoneSubscription) {
      this.zoneSubscription.unsubscribe();
    }
    if (this.zoneStatsSub) {
      this.zoneStatsSub.unsubscribe();
    }
  }

}
let zoneList: Zone[] = [];
