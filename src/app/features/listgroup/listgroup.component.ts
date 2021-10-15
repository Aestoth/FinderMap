import { Component, OnInit} from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { ModalController } from '@ionic/angular';
import { ModalComponent } from '../modal/modal.component';


@Component({
  selector: 'app-listgroup',
  templateUrl: './listgroup.component.html',
  styleUrls: ['./listgroup.component.scss']
})
export class ListGroupComponent implements OnInit {

  public groups: iPois[] = []
  public max: number = 17
  public tableau!: any[] 
 

  constructor(
    private readonly _wfService: WayfinderService,
    private readonly _modalController: ModalController
    ) {}

  ngOnInit():void {
    if(this._wfService.dataLoaded === true) {
      this.groups = this._wfService.getGroupsPois().map(g =>({...g}))
      return
    }
    this._wfService.wf.events.on("data-loaded", () => {
      this.groups = this._wfService.getGroupsPois().map(g =>({...g}))
      this._wfService.dataLoaded = true
      console.log('groups', this.groups); 
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

  async showModal(poi: iPois) {
    const poimodal = await this._modalController.create({
      component: ModalComponent,
      componentProps: {
        modalPoi: poi
      },
      cssClass: 'custom-class'
    })
    await poimodal.present();
  }

}
