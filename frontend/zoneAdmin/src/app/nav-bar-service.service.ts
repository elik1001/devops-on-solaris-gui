import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavBarServiceService {

  private navStateSource = new Subject<string>();
  currentComponentMsg = this.navStateSource.asObservable();

  constructor() { }

  changeMessage(message: string) {
    this.navStateSource.next(message);
  }

}
