import { Component, Input, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { ModalController } from '@ionic/angular';
import { ModalComponent } from '../modal/modal.component';
import { Firestore, collectionData, collection, setDoc, doc, updateDoc, QueryConstraint, where, query, orderBy, sortedChanges } from '@angular/fire/firestore';
import { first } from 'rxjs/operators';
import { StorageService } from '@app/@services/storage/storage.service';
import { FirebaseService } from '@app/@services/firebase/firebase.service';


@Component({
  selector: 'app-listpois',
  templateUrl: './listpois.component.html',
  styleUrls: ['./listpois.component.scss']
})
export class ListpoisComponent implements OnInit {

  public pois: iPois[] = []
  public searchTerm: string = ''

  constructor(
    private readonly wfService: WayfinderService, 
    private poisProvider: Provider,
    private _firestore: Firestore,
    private modalController: ModalController,
    private storage: StorageService,
    private _firebase: FirebaseService) {}

  async ngOnInit() {
    this.storage.loadIcon()
    const fbcol = collection(this._firestore, 'recherches');
    const data = await collectionData(fbcol, {idField: 'firebaseId'}).pipe(first()).toPromise();
    if(this.poisProvider.mapReady === true) {
      this.pois = this._firebase.aggregateData(this.wfService.getAllPois(), data as any)
      console.log(this.pois[0]);
      return
    }
    this.poisProvider.on("wf.map.ready").subscribe(() => {
      this.poisProvider.mapReady = true;
      this.pois = this._firebase.aggregateData(this.wfService.getAllPois(), data as any)
      console.log(this.pois[0]);
    })

  }

  viewPath(poi:iPois) {
    this.wfService.clickPath(poi.node)
    this._firebase.counterIncrement(poi)
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

  
    
}


