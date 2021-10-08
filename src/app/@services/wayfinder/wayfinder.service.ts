import { Injectable } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';


declare let Wayfinder3D: any;

@Injectable({
  providedIn: 'root',
})
export class WayfinderService {
  public wf: any;
  public lang!: string
  
  constructor(private provider: Provider) {
	  this.wf = new Wayfinder3D();
    this.wf.options.assetsLocation = '//static.3dwayfinder.com/shared';
    this.wf.apiLocation = '//api.3dwayfinder.com'
    this.wf.resize()
    

    this.wf.cbOnDataLoaded = () => {
      this.provider.eventEmit('wf.data.loaded', []);
    };

    this.wf.cbOnPOIClick = (poi: iPois) => {
			this.provider.eventEmit('wf.poi.click', poi);
		};

		this.wf.cbOnLanguageChange = (language: string) => {
			this.provider.eventEmit('wf.language.change', language);
		};

		this.wf.cbOnFloorChange = (floor: string) => {
			this.provider.eventEmit('wf.floor.change', floor);
		};

    this.wf.cbResize = () => {
      this.provider.eventEmit("wf.resize")
    }

		this.wf.cbOnBeforeFloorChange = (currentFloor: string, nextFloor: string, destinationFloor: string) => {
			this.provider.eventEmit('wf.path.floor.change', {
				current: currentFloor,
				next: nextFloor,
				destination: destinationFloor
			});
		};

		this.wf.cbOnMapReady = () => {
			this.provider.eventEmit('wf.map.ready', []);
		};

		this.wf.cbOnPathFinished = (path: string) => {
			this.provider.eventEmit('wf.path.finished', path);
		};
    
  }

  getPOIs() {
    return this.wf.getPOIs()
  }

  clickPath(poi: iPois) {
    this.wf.showPath(poi) 
  }

  getPOIGroups() {
    return this.wf.getPOIGroups()
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

  getAllPois(): iPois[] {
    let arr:iPois[] = []
    let _pois = this.wf.getPOIs();
    Object.keys(_pois).forEach((key: string) => {
      if(_pois[key].showInMenu) arr.push(_pois[key] as iPois)
    })
    console.log("arrPois", arr)
    return arr
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

}
