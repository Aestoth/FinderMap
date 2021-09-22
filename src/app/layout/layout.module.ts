import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';
import { MapComponent } from '@app/features/map/map.component';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '@app/@shared/shared.module';
import { SidebarComponent } from '@app/features/sidebar/sidebar.component';
import { ListpoisComponent } from '@app/features/listpois/listpois.component';
import { ListGroupComponent } from '@app/features/listgroup/listgroup.component';
import { ModalComponent } from '@app/features/modal/modal.component';
import { SearchComponent } from '@app/features/search/search.component';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    LayoutComponent,
    MapComponent,
    SidebarComponent,
    ListpoisComponent,
    ListGroupComponent,
    ModalComponent,
    SearchComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedModule,
    RouterModule.forChild([{ path: '', component: LayoutComponent}])
  ],
  exports: [LayoutComponent]
})
export class LayoutModule { }
