import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar.component';
import { IonicModule } from '@ionic/angular';



@NgModule({
  declarations: [
    SidebarComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [SidebarComponent]
})
export class SidebarModule { }
