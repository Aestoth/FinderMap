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

  public poifinder: any
  public groups!: iPois[] 
  public currentLanguage!: string
  public item!: iPois[]

  @Input('groupPois') poisGroups: iPois[] = this.groups
 

  constructor(private listService: WayfinderService,private groupPOISProvider: Provider) {
    this.poifinder = this.listService
   }

  ngOnInit():void {

    if(this.groupPOISProvider.mapReady === true) {
      this.groups = this.getGroupsPois()
      return
    }
    this.groupPOISProvider.on("wf.map.ready").subscribe(() => {
      this.groupPOISProvider.mapReady = true;
      this.groups = this.getGroupsPois()
    })

    this.groupPOISProvider.on("wf.poi.click").subscribe((poi: any) => {
      this.poifinder.showPath(poi)
    }) 
  }

  getGroupsPois(): iPois[] {
    let arr:iPois[] = []
    let _poisGroups = this.poifinder.getPOIGroups();
    console.log("poisGroups", _poisGroups);
    Object.keys(_poisGroups).forEach((key: string) => {
      if(_poisGroups[key].showInMenu) arr.push(_poisGroups[key] as iPois)
    })
    console.log("arrGroup", arr)
    return arr
  }

}
