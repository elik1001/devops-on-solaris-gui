import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { NavBarServiceService } from '../nav-bar-service.service';
import { AdminUsersService } from "../admin-users.service";
import { User } from '../model/adminUsersSchema';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog } from '@angular/material';
import { expandableRowAnimation } from './expandable-row.animation';

import { AddUserComponent } from './dialogs/add-user/add-user.component';
import { EditUserComponent } from './dialogs/edit-user/edit-user.component';
import { DeleteUserComponent } from './dialogs/delete-user/delete-user.component';

export interface Element {
  'longId': String;
  'id': number;
  'userID': String;
  'adminRole': String;
  'isLocal': String;
  'isActive': String;
  'pswdReset': Boolean;
}

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
  animations: [expandableRowAnimation],
})
export class AdminUsersComponent implements OnInit {
  userList: User[] = [];
  myZones: string;
  selectUser: User;
  toggleForm: boolean;
  emp_status: any = 'Active';


  displayedColumns: string[] = ['expand', 'id', 'userID', 'adminRole', 'isLocal', 'isActive', 'pswdReset', 'actions'];
  data = Object.assign(userList);
  dataSource = new MatTableDataSource<Element>(this.data);
  expandedElement: string = '';

  adminSubscription: any;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private adminUsersService: AdminUsersService,
    public dialog: MatDialog,
    public globals: AppGlobals,
    private navBarServiceService: NavBarServiceService,
  ) { }

  getUsers() {

    this.adminSubscription = this.adminUsersService.getUserList(this.globals.getEnvironment('baseUrl'))
      .subscribe((users: User[]) => {
        for (let i = 0; i < users['message'].length; i++) {
          if (typeof users['message'][i]['isActive'] == 'undefined') {
            this.emp_status = 'Disabled';
          } else {
            this.emp_status = users['message'][i]['isActive'];
          }

          userList[i] = {
            'longId': users['message'][i]['_id'],
            "id": i + 1,
            "userID": users['message'][i]['userID'],
            "adminRole": users['message'][i]['adminRole'],
            "isLocal": users['message'][i]['isLocal'],
            "isActive": this.emp_status,
            "pswdReset": users['message'][i]['pswdReset'],
          }
        }
        localStorage.setItem('token', users['token'])
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
  }

  addUser(user: User) {
    const dialogRef = this.dialog.open(AddUserComponent, {
      data: { user: user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        this.getUsers();
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

  deleteUser(i: number, _id: string, id: number, userID: string, adminRole: string, isLocal:string, isActive: string, pswdReset: boolean) {
    const dialogRef = this.dialog.open(DeleteUserComponent, {
      data: {
        _id: _id,
        id: id,
        userID: userID,
        adminRole: adminRole,
        isLocal: isLocal,
        isActive: isActive,
        pswdReset: pswdReset,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        let index: number = this.data.findIndex(d => _id === _id);
        this.data.splice(index, 1);
        this.getUsers();
        this.refreshTable();
      }
    });

  }

  editUser(i: number, _id: string, id: number, userID: string, adminRole: string, isLocal: string, isActive: string, pswdReset: boolean) {
    const dialogRef = this.dialog.open(EditUserComponent, {
      data: {
        _id: _id,
        id: id,
        userID: userID,
        adminRole: adminRole,
        isLocal: isLocal,
        isActive: isActive,
        pswdReset: pswdReset,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1) {
        const index = this.data.findIndex(item => item.longId === _id);
        this.data[index] = this.adminUsersService.getDialogData();
        this.getUsers();
        this.refreshTable();
      }
    });
  }

  ngOnInit() {
    this.getUsers();
    this.navBarServiceService.changeMessage("Application Administrators");
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

let userList: Element[] = [];
