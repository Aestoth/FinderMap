import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ListGroupComponent } from './listgroup.component';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    ListGroupComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{ path: 'shops', component: ListGroupComponent }])
  ],
  exports: [
    ListGroupComponent
  ]
})
export class ListGroupModule { }
