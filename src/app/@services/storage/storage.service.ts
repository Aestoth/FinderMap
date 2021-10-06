import { Injectable } from '@angular/core';
import { Storage, ref, listAll } from '@angular/fire/storage'

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  iconFile: any | undefined

  constructor(private _storage: Storage) { }

  async loadIcon() {
    const fbRef = ref(this._storage)
    const result= await listAll(fbRef)
    const icon = await Promise.all(
      result.items.map(async (item) => {
        const file = {
          name: item.name,
          fullPath: item.fullPath,
          bucket: item.bucket,
        };
        return file
      })
    )
    this.iconFile = {
      items: icon 
    }
  }
}
