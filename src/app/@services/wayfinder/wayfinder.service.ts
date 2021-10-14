import { Injectable } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { iPois } from '@app/@interfaces/pois';


declare let Wayfinder3D: any;

@Injectable({
  providedIn: 'root',
})
export class WayfinderService {
  public wf: any;
  public dataLoaded = false  
  constructor() {}

  async init() {
    await new Promise((resolve, reject)=> {
      setTimeout(()=> {
        this.dataLoaded = false
        this.wf = new Wayfinder3D();
        this.wf.options.assetsLocation = '//static.3dwayfinder.com/shared';
        this.wf.apiLocation = '//api.3dwayfinder.com'
        this.wf.resize()
        resolve(true)
      }, 100)
    }) 
  }

  

  clickPath(poi: iPois) {
    this.wf.showPath(poi) 
  }

  getSortedFloors() {
    return this.wf.building.getSortedFloors()
  }

  getGroupsPois(): iPois[] {
    let arr:iPois[] = []
    let _poisGroups = this.wf.getPOIGroups();
    Object.keys(_poisGroups).forEach((key: string) => {
      if(_poisGroups[key].showInMenu) arr.push(_poisGroups[key] as iPois)
    })
    return arr
  }

  getPoisList() {
    return this.wf.getPOIsArray()
  }

  onClick(floor: any){
    this.wf.showFloor(floor);
  }

  getMapFloors(): iFloors[] {
    let arr:iFloors[] = []
    let _floors = this.wf.building.getSortedFloors();
    Object.keys(_floors).forEach((key: string) => {
      if(_floors[key]) arr.push(_floors[key] as iFloors)
    })
    console.log("arr", arr)
    return arr
  }

  getLang() {
    return this.wf.getLanguage()
  }

}
