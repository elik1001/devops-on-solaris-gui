import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material';
// import { version } from '../../package.json';

@Injectable()
export class VersionCheckService {
  // this will be replaced by actual hash post-build.js
  private currentHash = '{{POST_BUILD_ENTERS_HASH_HERE}}';
  // public version: string = version;
  constructor(
    private http: HttpClient,
    private router: Router,
    private snackbar: MatSnackBar,
  ) { }

  /**
  * Checks in every set frequency the version of frontend application
  * @param url
  * @param {number} frequency - in milliseconds, defaults to 30 minutes
  */
  public initVersionCheck(url, frequency = 1000 * 60 * 30) {
  // public initVersionCheck(url, frequency = 60000) {
    this.checkVersion(url);

    setInterval(() => {
      this.checkVersion(url);
    }, frequency);
  }

  /**
  * Will do the call and check if the hash has changed or not
  * @param url
  */

  private checkVersion(url) {
    this.http.get(url + '?t=' + new Date().getTime())
      .subscribe(
        (response: any) => {
          const hash = response.hash;
          const version = response.version;
          const hashChanged = this.hasHashChanged(this.currentHash, hash);
          if (hashChanged) {
            const currentUrl = this.router.url;
            const snack = this.snackbar.open('Load New App Version: ' + version + ' ? ', 'Reload');
            snack
              .onAction()
              .subscribe(() => {
                // window.location.reload();
                this.currentHash = hash;
                // this.reloadCurrentRoute(['/']);
                this.reloadCurrentRoute(currentUrl);
              });

            /*setTimeout(() => {
              snack.dismiss();
            }, 10000);*/

          }

        },
        (err) => {
          console.error(err, 'Could not get version');
        }
      );
  }

  reloadCurrentRoute(currentUrl) {
    this.router.navigateByUrl('/', { skipLocationChange: false }).then(() => {
      window.location.reload(true);
      this.router.navigate([currentUrl], { replaceUrl: true });
    });
  }

  /**
  * Checks if hash has changed.
  * This file has the JS hash, if it is a different one than in the version.json
  * we are dealing with version change
  * @param currentHash
  * @param newHash
  * @returns {boolean}
  */

  private hasHashChanged(currentHash, newHash) {
    if (!currentHash || currentHash === '{{POST_BUILD_ENTERS_HASH_HERE}}') {
      return false;
    }
    return currentHash !== newHash;
  }
}
