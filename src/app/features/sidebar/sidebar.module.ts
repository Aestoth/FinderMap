import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar.component';
import { IonicModule } from '@ionic/angular';
import { ListpoisComponent } from '../listpois/listpois.component';
import { ListGroupComponent } from '../listgroup/listgroup.component';




@NgModule({
  declarations: [
    SidebarComponent,
    ListpoisComponent,
    ListGroupComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SidebarComponent,
  ]
})
export class SidebarModule { }
