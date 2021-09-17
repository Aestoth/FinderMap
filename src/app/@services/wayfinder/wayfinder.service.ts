import { Injectable } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';




declare let Wayfinder3D: any;


@Injectable({
  providedIn: 'root',
})
export class WayfinderService {
  private wf: any;
  public lang!: string
 
 
  
  constructor(private provider: Provider) {
	  this.wf = new Wayfinder3D();
    this.wf.options.assetsLocation = '//static.3dwayfinder.com/shared';
    this.wf.apiLocation = '//api.3dwayfinder.com'
    this.wf.resize()
	  console.log("wf", this.wf)

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
    
    return this.wf;
  }

  public setFloor(floor: []) {
    this.wf.showFloor(floor)
  }

  public getLanguage() {
    return this.wf.getLanguage();
  };

  public getTranslation(key: string, params: string) {
    console.log("translation", this.wf.translator.get(key))
    if(!params) {
      return this.wf.translator.translator.get(key)
    } else {
      return this.wf.translator.get(key, params)
    }
  }

}
