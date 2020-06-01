import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Component, Inject } from '@angular/core';
import { AppGlobals } from '../../../app.globals';
import { ToastrService } from 'ngx-toastr';
import { AdminUsersService } from "../../../admin-users.service";


@Component({
  selector: 'app-delete-user',
  templateUrl: './delete-user.component.html',
  styleUrls: ['./delete-user.component.scss']
})
export class DeleteUserComponent {

  constructor(
    public dialogRef: MatDialogRef<DeleteUserComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public adminUsersService: AdminUsersService,
    public globals: AppGlobals,
    public toastrService: ToastrService,
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  confirmDelete(userID: string): void {
    if (userID === this.globals.getCurrentUser()) {
      this.toastrService.error('Note: Account was not removed. Details: ' + userID + ', you cannot remove your own account!. please log-out, then continue removing the account.', 'Error occurred:', {
        timeOut: 8000,
        positionClass: 'toast-bottom-center',
      });
    } else {
      this.adminUsersService.deleteUser(this.globals.getEnvironment('baseUrl'), this.data._id);
    }

  }

}
