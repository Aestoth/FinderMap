import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '@app/@shared/shared.module';
import { RouterModule } from '@angular/router';
import { MapModule } from '@app/features/map/map.module';
import { SidebarModule } from '@app/features/sidebar/sidebar.module';
import { ListpoisModule } from '@app/features/listpois/listpois.module';
import { ListGroupModule } from '@app/features/listgroup/listgroup.module';
import { ModalModule } from '@app/features/modal/modal.module';
import { SearchModule } from '@app/features/search/search.module';



@NgModule({
  declarations: [
    LayoutComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    MapModule,
    SidebarModule,
    RouterModule.forChild([{ path: '', component: LayoutComponent}])
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class LayoutModule { }
