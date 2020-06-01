import { Injectable } from '@angular/core';
import {
  Router,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  ActivatedRoute,
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
//import decode from 'jwt-decode';
import { JwtHelperService } from '@auth0/angular-jwt';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})

export class RoleGuardService implements CanActivate {
  constructor(
    public auth: AuthService,
    public toasterService: ToastrService,
    private _router: Router,
  ) { }

  canActivate(
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean {
  const allowedRoles = next.data.allowedRoles;
  const isAuthorized = this.auth.isAuthorized(allowedRoles);

  if (!isAuthorized) {
    this._router.navigate(['/login']);

    this.toasterService.error('Error: 401 Unauthorized!', '', {
      timeOut: 8000,
      positionClass: 'toast-bottom-right',
    });
    return false;
  }

  return isAuthorized;
}

}
