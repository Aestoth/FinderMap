import { Component, OnInit} from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { Observable } from 'rxjs';



@Component({
  selector: 'app-listgroup',
  templateUrl: './listgroup.component.html',
  styleUrls: ['./listgroup.component.scss']
})
export class ListGroupComponent implements OnInit {

  public groups!: iPois[]
  public max: number = 15
  public fbUser!: Observable<string | undefined> | undefined; 
 

  constructor(
    private readonly _wfService: WayfinderService,
    private groupPOISProvider: Provider) {}

  ngOnInit():void {

    if(this.groupPOISProvider.mapReady === true) {
      this.groups = this._wfService.getGroupsPois()
      return
    }
    this._wfService.wf.events.on("data-loaded",() => {
      this.groupPOISProvider.mapReady = true;
      this.groups = this._wfService.getGroupsPois()
      console.log("items", this.groups);
    })
  }

  loadData($event: any) {
    if(this.groups.length  > this.max){
      this.max +=10
    }
    $event.target.complete()
  }

  async showPoiPath(poi:iPois) {
    this._wfService.clickPath(poi.node)
  }

}
