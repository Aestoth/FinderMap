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


  /**
   * Initialize a promise of new Wayfinder instance
   */
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


  /**
  * Get list of POIs
  * 
  * @returns list of POIs
  */
  getPoisList() {
    return this.wf.getPOIsArray();
  }


  /**
   * Show path to the given node
   * 
   * @param poi target the POI
   */
   clickPath(poi: iPois) {
    this.wf.showPath(poi) 
  }


  /**
   * Get groups of POI
   * 
   * @returns list of POI groups
   */
  getGroupsPois(): iPois[] {
    let arr:iPois[] = []
    let _poisGroups = this.wf.getPOIGroups();
    Object.keys(_poisGroups).forEach((key: string) => {
      if(_poisGroups[key].showInMenu) arr.push(_poisGroups[key] as iPois)
    })
    return arr
  }


  /**
   * Show selected floor
   * 
   * @param floor target floor
   */
   onClick(floor: any){
    this.wf.showFloor(floor);
  }


  /**
   * Get current Language
   * 
   * @returns current Languague
   */
  getLang() {
    return this.wf.getLanguage()
  }

}
