import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection, doc, setDoc, QueryConstraint, updateDoc, where, query } from '@angular/fire/firestore';
import { User,} from '@angular/fire/auth/'
import { iPois } from '@app/@interfaces/pois';
import { Observable } from 'rxjs';
import { WayfinderService } from '../wayfinder/wayfinder.service';
import { first } from 'rxjs/operators';



@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  public data$: Observable<any[]> | undefined
  public pois: iPois[] = []
  public stores$: Observable<any[]> | undefined

  constructor(
    private _firestore: Firestore,
    private _wfService: WayfinderService
    ) {}


  /**
   * Create an aggreation of data
   * 
   * @param a target array of POIs
   * @param b target array object from firebase
   * @returns the data aggregation
   */
  aggregateData(a: iPois[], b: {word: string, views: number, name: string, firebaseId: string}[]) {
    const result = [];
    for (let index = 0; index < a.length; index++) {
      const element = a[index];
      const exist = b.find(x => x.word === element.names.translations.en);
      const obj = {...element, views: exist?.views ? exist.views : 0, firebaseId: exist?.firebaseId ? exist.firebaseId : undefined, name: exist?.name ? exist.name : undefined};
      result.push(obj);
    }
    return result;
  }

  /**
   * Increment the count of views of a POI if user is connected
   * 
   * @param poi target the POI
   * @param uid target the User uid
   */
  async counterIncrement(poi: iPois, uid?: string) {
    const index = this.pois.findIndex(p => p.id === poi.id)
    const poisToUpdate = this.pois[index]
    const fbCollection = collection(this._firestore, 'recherches');
    const byStore = where('name', '==', poi.wayfinder.building.name)
    const byWord = where('word', '==', poi.names.translations.en)
    let totalViews = 1
    let id = Date.now()
    let q;
    if(uid) {
      const byUserId: QueryConstraint = where('uid', '==', uid)
      q = query(fbCollection, byUserId, byWord, byStore)
    } else {
      q = query(fbCollection, byWord, byStore)
    }
    const data = await collectionData(q, {idField: 'firebaseId'}).pipe(first()).toPromise();
    if (data.length === 0) {
      // create first count
      const fbDoc = doc(this._firestore, 'recherches/' +id);
      poisToUpdate.firebaseId = id.toString()
      if(uid) await setDoc(fbDoc, {word: poi.names.translations.en, views: 1, name: poi.wayfinder.building.name, uid});
    } else {
      // increment counter
      totalViews = poisToUpdate.views ? ++poisToUpdate.views : 1
      const fbDoc = doc(this._firestore, 'recherches/' + poisToUpdate.firebaseId);
      if(uid) await updateDoc(fbDoc, {views: totalViews, uid});
    }
    
    if(poisToUpdate) {
      poisToUpdate.views = totalViews
    }
    console.log('poiIndex', this.pois[index]);
  }

  /**
   * Return data if no user or aggregation data if user
   * 
   * @param user optional parameter of the user if it exists
   */
  async getData(user?: User) {
    //get pois
    const pois = this._wfService.getPoisList()
    // if user is connected load data aggregation from firebase
    if(user?.uid) {
      const fbCol = collection(this._firestore, 'recherches');
      // create constraint to load only user data
      const byUserId = where('uid', '==', user.uid);
      // create firebase query
      const q = query(fbCol, byUserId);
      // request data from firebase
      const data: any[] = await collectionData(q).pipe(first()).toPromise();
      // aggregate data
      this.pois = this.aggregateData(pois, data)
    } else {
      this.pois = pois
    }
  }

    getAllStores(): void{
    const fbstorecol = collection(this._firestore, 'stores');
    this.stores$ = collectionData(fbstorecol, {idField: 'id'});  
  }
}
