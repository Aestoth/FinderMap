import { Component, OnInit } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { Provider } from '@app/@provider/eventprovider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public floors!: iFloors[]
  

  constructor(
    private readonly wfService: WayfinderService,
    private dataBroadcast: Provider) {}

  ngOnInit(): void {
    this.wfService.wf.open("2eebb99f3154c041f23acd836ccad09b")
    this.dataBroadcast.on("wf.data.loaded").subscribe(() => {
      this.floors = this.wfService.getMapFloors()
    })
  }

  floorClick() {
    this.wfService.onClick(this.floors)
  }

}
