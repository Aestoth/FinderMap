import { Component, OnInit } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/provider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';




@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public wayfinder: any
  public floors!: iFloors[]
  public activeFloors!: iFloors[]
  

  constructor(
    private wayfinderService: WayfinderService,
    private dataBroadcast: Provider) {
      this.wayfinder = this.wayfinderService
   }

  ngOnInit(): void {
    this.wayfinder.open("2eebb99f3154c041f23acd836ccad09b")

    this.dataBroadcast.on("wf.data.loaded").subscribe(() => {
      this.floors = this.extractFloors()
      console.log("_floors", this.floors)
    })

  }

  onClick(floor: any){
    this.wayfinder.showFloor(floor);
  }

  extractFloors(): iFloors[] {
    let arr:iFloors[] = []
    let _floors = this.wayfinder.building.getSortedFloors();
    Object.keys(_floors).forEach((key: string) => {
      if(_floors[key]) arr.push(_floors[key] as iFloors)
    })
    console.log("arr", arr)
    return arr
  }

}
