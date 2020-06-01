import { Injectable } from '@angular/core';
//import { AuthService } from './auth.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from 'src/environments/environment';

@Injectable()
export class AppGlobals {
  constructor(
    private jwtHelperService: JwtHelperService,
  ) { }

  baseUrl: string;
  dc1Hosts: Array<string>;
  dc2Hosts: Array<string>

  getEnvironment(envName) {
    // Oracle Solaris host list, below are two lines. line one is data center 1, line two is data center 2.
    this.dc1Hosts = ['https://dc1-devops1.domain.com:6788', 'https://dc1-devops2.domain.com:6788'];
    this.dc2Hosts = ['https://dc2-devops1.domain.com:6788', 'https://dc2-devops2.domain.com:6788'];
    if (environment.production) {
      // You production backend server (host only as we use https)
      this.baseUrl = 'https://dc2-confmgr1.domain.com:8080';
    } else {
      // You dev backend server (host or ip)
      this.baseUrl = 'http://192.168.100.169:8080';
    }
    return this[envName];
  }

  getCurrentUser() {
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(this.getToken());
    let currentUser = decodedToken['sub'];
    return currentUser;
  }

  getCurrentRole() {
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(this.getToken());
    let currentRole = decodedToken['role'];
    return currentRole;
  }

  getToken() {
    return localStorage.getItem('token')
  }

}
