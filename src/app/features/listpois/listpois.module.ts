import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListpoisComponent } from './listpois.component';
import { ModalComponent } from '../modal/modal.component';




@NgModule({
  declarations: [
    ListpoisComponent,
    ModalComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ListpoisComponent
  ]
})
export class ListpoisModule { }
