import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './modal.component';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '@app/@shared/shared.module';


@NgModule({
  declarations: [
    ModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedModule
  ],
  exports: [ModalComponent]
})
export class ModalModule { }
