import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    MapComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{ path: 'map', component: MapComponent }])
  ],
  exports: [
    MapComponent
  ]
})
export class MapModule { }
