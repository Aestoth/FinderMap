import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { poiSearchPipe } from './pipes/poi-search.pipe';
import { IconPipe } from './pipes/icon.pipe';



@NgModule({
  declarations: [
    poiSearchPipe,
    IconPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    poiSearchPipe,
    IconPipe
  ]
})
export class SharedModule { }
