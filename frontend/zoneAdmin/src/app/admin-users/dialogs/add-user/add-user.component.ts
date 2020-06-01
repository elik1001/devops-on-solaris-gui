import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { AppGlobals } from '../../../app.globals';
import { Component, Inject } from '@angular/core';
// import {DataService} from '../../services/data.service';
import { AdminUsersService } from "../../../admin-users.service";
import { FormControl, Validators } from '@angular/forms';
// import {Issue} from '../../models/issue';
import { User } from '../../../model/adminUsersSchema';

@Component({
  selector: 'app-add',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent {

  constructor(
    public dialogRef: MatDialogRef<AddUserComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User,
    public adminUsersService: AdminUsersService,
    public globals: AppGlobals,
  ) { }

  formControl = new FormControl('', [
    Validators.required
    // Validators.email,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required') ? 'Required field' :
      this.formControl.hasError('email') ? 'Not a valid email' :
        '';
  }

  submit() {
    // emppty stuff
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    this.adminUsersService.addUser(this.globals.getEnvironment('baseUrl'), this.data);
  }

}
