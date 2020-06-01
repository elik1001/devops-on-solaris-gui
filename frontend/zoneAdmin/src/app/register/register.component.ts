import { Component, OnInit } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { AuthService } from '../auth.service';
import { AdminUsersService } from "../admin-users.service";
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerUserData: any = {};
  isloggingIn = false;

  constructor(
    private _auth: AuthService,
    private _router: Router,
    private toastrService: ToastrService,
    public adminUsersService: AdminUsersService,
    public globals: AppGlobals,
  ) { }

  formControl = new FormControl('', [
    Validators.required
    // Validators.email,
  ]);

  getErrorMessage() {
    return this.formControl.hasError('required') ? 'Required field' :
      this.formControl.hasError('userID') ? 'Not a valid userID' :
        '';
  }

  ngOnInit() {
  }

  registerUser() {
    this.isloggingIn = true;
    this._auth.registerUser(this.registerUserData)
      .subscribe(
        res => {
          this.isloggingIn = false;
          this._router.navigate(['/login']);
          if (res && res['registeredUser']['isActive'] !== 'Active') {
            this.toastrService.success('Please consult an administrator to activate your account.', 'Successfully registered:', {
              timeOut: 3000,
              positionClass: 'toast-bottom-right',
            });
          } else {
            this.toastrService.success('You password was successfully reset.', 'Password reset:', {
              timeOut: 3000,
              positionClass: 'toast-bottom-right',
            });
          }
        },
        err =>
          (errMsg: HttpErrorResponse) => {
            this.isloggingIn = false;
            this.toastrService.error('Error occurred. Details: ' + errMsg.name + ' ' + errMsg.message, '', {
              timeOut: 8000,
              positionClass: 'toast-bottom-right',
            });
          });
  }

}
