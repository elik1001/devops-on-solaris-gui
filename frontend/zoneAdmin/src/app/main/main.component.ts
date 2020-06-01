import { Component, OnInit } from '@angular/core';
import { AppGlobals } from '../app.globals';
import { AuthService } from '../auth.service';
import { ZoneService } from '../zone.service';
import { NavBarServiceService } from '../nav-bar-service.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  refreshTokenSub: Subscription;

  constructor(
    public _authService: AuthService,
    private zoneService: ZoneService,
    public globals: AppGlobals,
    private navBarServiceService: NavBarServiceService,
  ) { }

  ngOnInit() {
    this.refreshTokenSub = this.zoneService.refreshToken(this.globals.getEnvironment('baseUrl'))
      .subscribe(data => {
        localStorage.setItem('token', data['token']);
      });
      this.navBarServiceService.changeMessage("Home");
  }

  ngOnDestroy() {
    if (this.refreshTokenSub) {
      this.refreshTokenSub.unsubscribe();
    }
  }
}
