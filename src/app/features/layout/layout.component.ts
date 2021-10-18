import { AfterViewInit, Component, Input } from '@angular/core';
import { authState, User, Auth, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth/'
import { Router } from '@angular/router';
import { iBuilding } from '@app/@interfaces/building';
import { iPois } from '@app/@interfaces/pois';
import { FirebaseService } from '@app/@services/firebase/firebase.service';
import { StorageService } from '@app/@services/storage/storage.service';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { Observable, of } from 'rxjs';
import { first, map } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements AfterViewInit {

  public user$: Observable<User | any> = of({})
  public pois: iPois[] = []
  public wf: any
  public buildingName!: string
  
  
  constructor(
    private readonly _auth: Auth, 
    private readonly _firebase: FirebaseService,
    private readonly _storageService: StorageService,
    private readonly _wfService: WayfinderService,
    private router: Router
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

    async ngAfterViewInit() {
      await this._wfService.init()
      this.wf = this._wfService.wf
      console.log('wf', this.wf);
      

      this._wfService.wf.events.on("data-loaded", () => {
        this.buildingName = this._wfService.setBuildingName(this._wfService.wf.building, "lastWorld");
        console.log('name', this.buildingName);
         
      })  
    }

    async ionViewWillEnter() {
      //get user from firebase
      const user = await this.user$.pipe(first()).toPromise()
      console.log('userLayout', user);
      this._firebase.getData(user)
      this._storageService.loadIcon()
    }

    redirect() {
      this.router.navigateByUrl('home')
    }

    logout() {
      signOut(this._auth)
    }

    showLanguage() {
      const lang = this._wfService.getLang()
      console.log(lang);
      
    }

}
