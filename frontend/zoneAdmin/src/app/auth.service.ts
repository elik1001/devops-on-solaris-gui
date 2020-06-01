import { Injectable } from '@angular/core';
import { AppGlobals } from './app.globals';
import { HttpClient, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router'
import { JwtHelperService } from '@auth0/angular-jwt';
import { ToastrService } from 'ngx-toastr';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private _router: Router,
    private jwtHelperService: JwtHelperService,
    private toastrService: ToastrService,
    public globals: AppGlobals,
  ) { }

  registerUser(user) {
    return this.http.post<any>(this.globals.getEnvironment('baseUrl') + '/api/register', user)
  }

  updateRegisterUser(id, user) {
    return this.http.post<any>(this.globals.getEnvironment('baseUrl') + '/api/register/' + id, user);
  }

  loginUser(user) {
    return this.http.post<any>(this.globals.getEnvironment('baseUrl') + '/api/login', user)
  }

  refreshToken(ipAddress) {
    let headers = new HttpHeaders();
    return this.http.post(this.globals.getEnvironment('baseUrl') + '/api/updateToken', { headers: headers });
  }

  logoutUser() {
    localStorage.removeItem('token')
    this._router.navigate(['/login'])
    this.toastrService.success('Successfully logged out', '', {
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
    });
  }

  getToken() {
    return localStorage.getItem('token')
  }

  loggedIn() {
    return !!localStorage.getItem('token')
  }

  canGuests(): boolean {
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(this.getToken());
    const allowed = ['Admin', 'Zone-Admin', 'Zone-Users', 'Zone-Guests']
    return this.checkAuthorization(decodedToken.role, allowed)
  }

  canUsers(): boolean {
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(this.getToken());
    const allowed = ['Admin', 'Zone-Admin', 'Zone-Users']
    return this.checkAuthorization(decodedToken.role, allowed)
  }

  canZoneAdmin(): boolean {
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(this.getToken());
    const allowed = ['Admin', 'Zone-Admin']
    return this.checkAuthorization(decodedToken.role, allowed)
  }

  canAdmin(): boolean {
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(this.getToken());
    const allowed = ['Admin']
    return this.checkAuthorization(decodedToken.role, allowed)
  }

  checkAuthorization(user: string, allowedRoles: string[]): boolean {
    if (!user) return false
    for (const role of allowedRoles) {
      if (user === role) {
        return true
      }
    }
    return false
  }

  isAuthorized(allowedRoles: string[]): boolean {

    if (allowedRoles == null || allowedRoles.length === 0) {
      return true;
    }

    // get token from local storage or state management
    const token = localStorage.getItem('token');

    // decode token to read the payload details
    const decodeToken = this.jwtHelperService.decodeToken(token);

    // check if it was decoded successfully, if not the token is not valid, deny access
    if (!decodeToken) {
      // console.log('Invalid token');
      return false;
    }

    // check if the user roles is in the list of allowed roles, return true if allowed and false if not allowed
    return allowedRoles.includes(decodeToken['role']);
  }

}
