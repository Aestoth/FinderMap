import { Injectable } from '@angular/core';
import { Storage, ref, listAll, ListResult } from '@angular/fire/storage'

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  iconFile: {items: ListResult} | undefined

  constructor(private _storage: Storage) { }

  async loadIcon() {
    const fbRef = ref(this._storage)
    const result= await listAll(fbRef)
    this.iconFile = {
      items: result 
    }
    console.log(this.iconFile);
    
  }
  
}
