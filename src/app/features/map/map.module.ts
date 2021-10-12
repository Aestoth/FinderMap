import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/@shared/shared.module';
import { ActiveDirective } from './directive/active.directive';


@NgModule({
  declarations: [
    MapComponent,
    ActiveDirective
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{ path: 'map', component: MapComponent }]),
    SharedModule
  ],
  exports: [
    MapComponent
  ]
})
export class MapModule { }
