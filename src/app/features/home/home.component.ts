import { Component, OnInit } from '@angular/core';
import { authState, User, Auth, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth/'
import { Router } from '@angular/router';
import { iPois } from '@app/@interfaces/pois';
import { FirebaseService } from '@app/@services/firebase/firebase.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public user$: Observable<User | any> = of({})
  public store: Observable<any[]> | undefined

  slideOpts = {
    initialSlide: 0,
    spaceBetween: 0,
    slidesPerView: 1.8,
    slidesOffsetBefore: 6
  }
  

  constructor(
    private readonly _auth: Auth,
    private readonly _firebase: FirebaseService,
    private _router: Router) {
      this.user$ = authState(this._auth).pipe(
        map((user: User|null) => {
          if(user) {
            return user
          }
          return {}
        })
      );
     }

  ngOnInit(): void {
    this._firebase.getAllStores();
    this.store = this._firebase.data$;
    console.log('store', this.store);
    
  }

  async login() {
    const {user}= await signInWithPopup(this._auth, new GoogleAuthProvider)
    this._firebase.getData(user)
    this._router.navigateByUrl('layout')
  }

  logout() {
    signOut(this._auth)
  }

}
