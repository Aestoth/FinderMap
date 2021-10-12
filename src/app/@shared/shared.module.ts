import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { poiSearchPipe } from './pipes/poi-search.pipe';
import { IconPipe } from './pipes/icon.pipe';
import { TranslatePipe } from './pipes/translate.pipe';



@NgModule({
  declarations: [
    poiSearchPipe,
    IconPipe,
    TranslatePipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    poiSearchPipe,
    IconPipe,
    TranslatePipe
  ]
})
export class SharedModule { }
