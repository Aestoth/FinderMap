import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';
import { ListGroupComponent } from '@app/feature/listGroup/listgroup.component';
import { MapComponent } from '@app/feature/map/map.component';
import { IonicModule } from '@ionic/angular';
import { SidebarComponent } from '@app/feature/sidebar/sidebar.component';
import { SharedModule } from '@app/@shared/shared.module';






@NgModule({
  declarations: [
    LayoutComponent,
    ListGroupComponent,
    MapComponent,
    SidebarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedModule
  ]
})
export class LayoutModule { }
