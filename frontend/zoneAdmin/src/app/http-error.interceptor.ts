import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from "@angular/core"
import { Router } from '@angular/router'
import { MatDialog } from '@angular/material';
import { Observable, of, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(
    public toasterService: ToastrService,
    private _router: Router,
    public dialog: MatDialog,
  ) { }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    return next.handle(req).pipe(
      tap(evt => {
        if (evt instanceof HttpResponse) {
          if (evt.body && evt.body.success)
            this.toasterService.success(evt.body.success.message, evt.body.success.title, { positionClass: 'toast-bottom-center' });
        }
      }),
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          localStorage.removeItem('token');
          if (this.dialog.openDialogs.length > 0) {
            this.dialog.closeAll();
          }
          this._router.navigate(['/login']);
          try {
            // console.log(err.statusText);
            if (err.statusText === "Unauthorized") {
              this.toasterService.error(err.error, 'Unauthorized:', {
                timeOut: 0,
                closeButton: true,
                positionClass: 'toast-bottom-right',
              });
            } else {
              this.toasterService.error(err.statusText, 'Error occurred:', {
                timeOut: 8000,
                positionClass: 'toast-bottom-right',
              });
            }
          } catch (e) {
            this.toasterService.error(err.error, 'Error occurred:', {
              timeOut: 8000,
              positionClass: 'toast-bottom-center',
            });
          }
        }
        //return of(err);
        return throwError(err)
      }));

  }

}
