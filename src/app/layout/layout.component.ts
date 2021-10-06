import { query } from '@angular/animations';
import { Component} from '@angular/core';
import { authState, user, User, Auth, signInWithPopup, GoogleAuthProvider, UserCredential, signOut } from '@angular/fire/auth/'
import { Firestore, collectionData, collection, where } from '@angular/fire/firestore';
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

  public data: Observable<any[]> | undefined
  public user$: Observable<User | any> = of({})
  public pois: iPois[] = []
  
  constructor(
    private readonly _auth: Auth, 
    private readonly _firebase: FirebaseService,
    private readonly _firestore: Firestore
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
    }

    async getData(user?: User) {
      //get pois
      const pois = this.pois
      // if user is connected load data aggregation from firebase
      if(user?.uid) {
        const fbCol = collection(this._firestore, 'recherches');
        // create constraint to load only user data
        // const byUserId = where('uid', '==', user.uid);
        // create firebase query
        // const q = query(fbCol, byUserId);
        // request data from firebase
        // const data: any[] = await collectionData().pipe(first()).toPromise();
        // aggregate data
        // this.pois = this._firebase.aggregateData(pois, data)
      } else {
        this.pois = pois
      }
    }

    async login() {
      const {user}= await signInWithPopup(this._auth, new GoogleAuthProvider)
      this.getData(user)
    }

    logout() {
      signOut(this._auth)
      this.getData()
    }

}
