import { Component} from '@angular/core';
import { authState, User, Auth, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth/'
import { iPois } from '@app/@interfaces/pois';
import { FirebaseService } from '@app/@services/firebase/firebase.service';
import { Observable, of } from 'rxjs';
import { first, map } from 'rxjs/operators';


@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {

  public user$: Observable<User | any> = of({})
  public pois: iPois[] = []
  
  
  constructor(
    private readonly _auth: Auth, 
    private readonly _firebase: FirebaseService,
    ) {
      this.user$ = authState(this._auth).pipe(
        map((user: User|null) => {
          if(user) {
            return user
          }
          return {}
        })
      )
    }

    async ionViewWillEnter() {
      //get user from firebase
      const user = await this.user$.pipe(first()).toPromise()
      console.log('userLayout', user);
      this._firebase.getData(user)
    }

    async login() {
      const {user}= await signInWithPopup(this._auth, new GoogleAuthProvider)
      this._firebase.getData(user)
    }

    logout() {
      signOut(this._auth)
    }

}
