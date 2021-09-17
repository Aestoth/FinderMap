import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { IonicModule } from '@ionic/angular';



@NgModule({
  declarations: [
    MapComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  exports: [
    MapComponent
  ]
})
export class MapModule { }
