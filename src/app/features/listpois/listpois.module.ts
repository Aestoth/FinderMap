import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListpoisComponent } from './listpois.component';
import { IonicModule } from '@ionic/angular';
import { SearchModule } from '../search/search.module';
import { SharedModule } from '@app/@shared/shared.module';
import { ModalModule } from '../modal/modal.module';



@NgModule({
  declarations: [
    ListpoisComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    SearchModule,
    SharedModule,
    ModalModule
  ],
  exports: [
    ListpoisComponent
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class ListpoisModule { }
