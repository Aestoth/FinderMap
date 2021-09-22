import { Component, Input, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { Provider } from '@app/@provider/eventprovider';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';
import { ModalController } from '@ionic/angular';
import { ModalComponent } from '../modal/modal.component';


@Component({
  selector: 'app-listpois',
  templateUrl: './listpois.component.html',
  styleUrls: ['./listpois.component.scss']
})
export class ListpoisComponent implements OnInit {

  public allPoiFinder: any
  public pois: iPois[] = []
  public searchTerm: string = ''

  @Input('Pois') allPois: iPois[] = this.pois
  
  constructor(
    private listPoisService: WayfinderService, 
    private poisProvider: Provider,
    private modalController: ModalController) {
    this.allPoiFinder = this.listPoisService
  }

  ngOnInit(): void {

    if(this.poisProvider.mapReady === true) {
      this.pois = this.getAllPois()
      return
    }
    this.poisProvider.on("wf.map.ready").subscribe(() => {
      this.poisProvider.mapReady = true;
      this.pois = this.getAllPois()
    })

  }

  getAllPois(): iPois[] {
    let arr:iPois[] = []
    let _pois = this.allPoiFinder.getPOIs();
    Object.keys(_pois).forEach((key: string) => {
      if(_pois[key].showInMenu) arr.push(_pois[key] as iPois)
    })
    console.log("arrPois", arr)
    return arr
  }

  clickPath(poi: iPois) {
   this.allPoiFinder.showPath(poi) 
  }

  async showModal(poi: iPois) {
    const poimodal = await this.modalController.create({
      component: ModalComponent,
      componentProps: {
        modalPoi: poi
      },
      cssClass: 'custom-class'
    })
    await poimodal.present();
  }

  searchFilter($event: any) {
    this.searchTerm = $event.detail.value
  }

}
