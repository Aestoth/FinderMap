import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection, doc, setDoc, QueryConstraint, updateDoc, where } from '@angular/fire/firestore';
import { authState, user, User, Auth, signInWithPopup, GoogleAuthProvider, UserCredential, signOut } from '@angular/fire/auth/'
import { iPois } from '@app/@interfaces/pois';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  public data$: Observable<any[]> | undefined
  public pois: iPois[] = []

  constructor(private _firestore: Firestore) { }

  
  load(uid: string): void {
    const fbCollection = collection(this._firestore, 'recherches');
    const byUserId: QueryConstraint = where('uid', '==', uid)
    this.data$ = collectionData(fbCollection, {idField: 'id'});
  }

  aggregateData(a: iPois[], b: {word: string, views: number, firebaseId: string}[]) {
    const result = [];
    for (let index = 0; index < a.length; index++) {
      const element = a[index];
      const exist = b.find(x => x.word === element.names.translations.en);
      const obj = {...element, views: exist?.views ? exist.views : 0, firebaseId: exist?.firebaseId ? exist.firebaseId : undefined};
      result.push(obj);
    }
    return result;
  }

  async counterIncrement(poi: iPois) {
    let totalViews = 1
    let id = Date.now()
    console.log('poi', poi);
    if (poi.views === 0) {
      // create first count
      const fbDoc = doc(this._firestore, 'recherches/' +id);
      await setDoc(fbDoc, {word: poi.names.translations.en, views: 1});
    } else {
      // increment counter
      totalViews = poi.views ? ++poi.views : 1
      const fbDoc = doc(this._firestore, 'recherches/' + poi.firebaseId);
      await updateDoc(fbDoc, {views: totalViews});
    }
    const poisToUpdate = this.pois.find(p => p.id === poi.id)
    if(poisToUpdate) {
      poisToUpdate.views = totalViews
      poisToUpdate.firebaseId = id.toString()
    }
  }
}
