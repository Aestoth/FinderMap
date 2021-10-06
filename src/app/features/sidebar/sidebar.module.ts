import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar.component';
import { IonicModule } from '@ionic/angular';
import { ListpoisModule } from '../listpois/listpois.module';
import { ListGroupModule } from '../listgroup/listgroup.module';



@NgModule({
  declarations: [
    SidebarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    ListpoisModule,
    ListGroupModule,
  ],
  exports: [
    SidebarComponent,
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class SidebarModule { }
