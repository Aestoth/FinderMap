import { Component, Input, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { ModalController } from '@ionic/angular';
import { ModalComponent } from '../modal/modal.component';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { first, map } from 'rxjs/operators';
import { StorageService } from '@app/@services/storage/storage.service';
import { FirebaseService } from '@app/@services/firebase/firebase.service';
import { authState, User, Auth } from '@angular/fire/auth/'
import { Observable, of } from 'rxjs';


@Component({
  selector: 'app-listpois',
  templateUrl: './listpois.component.html',
  styleUrls: ['./listpois.component.scss']
})
export class ListpoisComponent implements OnInit {

  public pois: iPois[] = []
  public data: any[] = []
  public searchTerm: string = ''
  public fbUser!: Observable<string | undefined> | undefined;
  public max: number = 15
  

  constructor(
    private readonly _wfService: WayfinderService, 
    private readonly poisProvider: Provider,
    private readonly _firestore: Firestore,
    private readonly modalController: ModalController,
    private readonly _storage: StorageService,
    private readonly _firebase: FirebaseService,
    private readonly _auth: Auth) {}

  async ngOnInit() {
    
    this.fbUser =  authState(this._auth).pipe(map(user => user?.uid || undefined))
    console.log(this.fbUser);
    
    
    this._storage.loadIcon()
    
    const fbcol = collection(this._firestore, 'recherches');
    if(this.fbUser) {
      this.data = await collectionData(fbcol, {idField: 'firebaseId'}).pipe(first()).toPromise();
      this.pois = this._firebase.aggregateData(this._wfService.getAllPois(), this.data as any)

      this.poisProvider.on("wf.map.ready").subscribe(() => {
        this.poisProvider.mapReady = true;
        this.pois = this._firebase.aggregateData(this._wfService.getAllPois(), this.data as any)
        console.log('poiList',this.pois[0]);
      })
    } else {
      if(this.poisProvider.mapReady === true) {
        this.pois = this._wfService.getAllPois()
        console.log('poiList',this.pois[0]);
        return
      }
      this.poisProvider.on("wf.map.ready").subscribe(() => {
        this.poisProvider.mapReady = true;
        this.pois = this._wfService.getAllPois()
        console.log('poiList',this.pois[0]);
      })
    }

  }

  async viewPath(poi:iPois) {
    this._wfService.clickPath(poi.node)
    const fbUser = await this.fbUser?.pipe(first()).toPromise()
    if(fbUser) {
      await this._firebase.counterIncrement(poi, fbUser)
    }
  }

  async showModal(poi: iPois) {
    const poimodal = await this.modalController.create({
      component: ModalComponent,
      componentProps: {
        modalPoi: poi
      },
      cssClass: 'custom-class'
    })
    await poimodal.present();
  }

  searchFilter($event: any) {
    this.searchTerm = $event.detail.value 
  }

  trackBy(index: number, poi: iPois): string {
    return poi.id;
  }

  loadData($event: any) {
    if(this.pois.length > this.max){
      this.max +=10
    }
    $event.target.complete()
  }
  
}


