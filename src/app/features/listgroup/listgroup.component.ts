import { Component, Input, OnInit, Output, TemplateRef} from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';



@Component({
  selector: 'app-listgroup',
  templateUrl: './listgroup.component.html',
  styleUrls: ['./listgroup.component.scss']
})
export class ListGroupComponent implements OnInit {

  public groups!: iPois[] 
 

  constructor(
    private readonly wfService: WayfinderService,
    private groupPOISProvider: Provider) {}

  ngOnInit():void {

    if(this.groupPOISProvider.mapReady === true) {
      this.groups = this.wfService.getGroupsPois()
      return
    }
    this.groupPOISProvider.on("wf.map.ready").subscribe(() => {
      this.groupPOISProvider.mapReady = true;
      this.groups = this.wfService.getGroupsPois()
      console.log("items", this.groups);
    })
  }

}
