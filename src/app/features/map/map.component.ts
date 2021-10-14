import { AfterViewInit, Component } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { ToastController } from '@ionic/angular';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  public floors!: iFloors[]
  public message!: string
  

  constructor(
    private readonly _wfService: WayfinderService,
    private _toastController: ToastController) {}

  ngAfterViewInit(): void {
    this._wfService.wf.open("2eebb99f3154c041f23acd836ccad09b")
    this._wfService.wf.events.on("data-loaded", () => {
      this.floors = this._wfService.wf.building.getSortedFloors()
    })
    this._wfService.wf.events.on("floor-change-before", (currentFloor: any, nextFloor:any) => {
			const pathText = this._wfService.wf.translator.get("go_to_floor", [currentFloor.getName(this._wfService.getLang()), nextFloor.getName(this._wfService.getLang())])
      this.displayToast(pathText)
    })   
  }

  floorClick(floor: iFloors) {
    this._wfService.onClick(floor)
  }

  async displayToast(text: string){
    const toast = await this._toastController.create({
      message: text
    })
    await toast.present()
  }

}
