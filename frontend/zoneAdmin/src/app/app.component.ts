import { Component } from '@angular/core';
import { AuthService } from './auth.service';
import { NavBarServiceService } from './nav-bar-service.service';
import { VersionCheckService } from './version-check.service';
import { environment } from 'src/environments/environment';
import { version } from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [VersionCheckService],
})
export class AppComponent {
  public version: string = version;

  title = 'zoneAdmin';
  opened = false;
  topBarMessage: string;
  private navBarSub: any;

  constructor(
    public _authService: AuthService,
    private navBarServiceService: NavBarServiceService,
    private versionCheckService: VersionCheckService,
  ) { }
  ngOnInit() {
    if (environment.production) {
      this.versionCheckService.initVersionCheck(environment.versionCheckURL);
    }
    this.navBarSub = this.navBarServiceService.currentComponentMsg.subscribe(message => this.topBarMessage = message);
  }

  ngOnDestroy() {
    this.navBarSub.unsubscribe();
  }

}
