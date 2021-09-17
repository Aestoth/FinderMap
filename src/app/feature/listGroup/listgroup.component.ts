import { Component, Input, OnInit, Output, TemplateRef} from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { iProvider } from '@app/@interfaces/provider';
import { Provider } from '@app/@provider/provider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';



@Component({
  selector: 'app-listgroup',
  templateUrl: './listgroup.component.html',
  styleUrls: ['./listlistgroup.component.scss']
})
export class ListGroupComponent implements OnInit {

  public poifinder: any
  public pois!: iPois[]
  public groups!: iPois[] 
  public currentLanguage!: string
  public item!: iPois[]

  @Input() poisGroups: iPois[] = this.groups
  @Input() allPois: iPois[] = this.pois

  constructor(private listService: WayfinderService,private poisBroadcast: Provider) {
    this.poifinder = this.listService
   }

  ngOnInit():void {

    if(this.poisBroadcast.mapReady === true) {
      this.groups = this.extractGroups()
      this.pois = this.extractPois()
      return
    }
    this.poisBroadcast.on("wf.map.ready").subscribe(() => {
      this.poisBroadcast.mapReady = true;
      this.groups = this.extractGroups()
      this.pois = this.extractPois()
    })

    this.poisBroadcast.on("wf.poi.click").subscribe((poi: any) => {
      this.showPath(poi)
    }) 
  }

  extractGroups(): iPois[] {
    let arr:iPois[] = []
    let _poisGroups = this.poifinder.getPOIGroups();
    console.log("poisGroups", _poisGroups);
    Object.keys(_poisGroups).forEach((key: string) => {
      if(_poisGroups[key].showInMenu) arr.push(_poisGroups[key] as iPois)
    })
    console.log("arrGroup", arr)
    return arr
  }

  extractPois(): iPois[] {
    let arr:iPois[] = []
    let _pois = this.poifinder.getPOIs();
    Object.keys(_pois).forEach((key: string) => {
      if(_pois[key].showInMenu) arr.push(_pois[key] as iPois)
    })
    console.log("arrPois", arr)
    return arr
  }

  showPath(poi: any) {
    this.poifinder.showPath(poi.getNode(), poi)
  }

}
