import { Component, OnInit } from '@angular/core';
import { AppGlobals } from '../app.globals';
//import { HttpErrorResponse } from '@angular/common/http';
import { NavBarServiceService } from '../nav-bar-service.service';
import { AuthService } from '../auth.service';
import { AdminUsersService } from "../admin-users.service";
import { Router } from '@angular/router'
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { tap, switchMap, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginUserData: any = {};
  errorLogin: boolean = false;
  isloggingIn = false;

  constructor(
    private _auth: AuthService,
    private _router: Router,
    private toastrService: ToastrService,
    public adminUsersService: AdminUsersService,
    public globals: AppGlobals,
    private navBarServiceService: NavBarServiceService,
  ) { }

  formControl = new FormControl('', [
    Validators.required,
    // Validators.email,
    // Validators.errorLogin,
  ]);

  getErrorMessage() {
    return this.formControl.hasError('required') ? 'Required field' :
      this.formControl.hasError('userID') ? 'Not a valid userID' :
        this.formControl.hasError('errorLogin') ? 'Error: 401 Unauthorized!' :
          '';
  }

  ngOnInit() {
    this.navBarServiceService.changeMessage("Login");
  }

  loginUser(form) {
    this.isloggingIn = true;
    this._auth.loginUser(this.loginUserData)
      .subscribe(res => {
        this.isloggingIn = false;
        localStorage.setItem('token', res.token);
        this.toastrService.success('Successfully logged in', '', {
          timeOut: 3000,
          positionClass: 'toast-bottom-right',
        });
        this._router.navigate(['/employee'])
      },
        err => {
          this.errorLogin = true;
          this.isloggingIn = false;
          form.resetForm();
        });
  }

}
