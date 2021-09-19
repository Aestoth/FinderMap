import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { poiSearchPipe } from './pipes/poi-search.pipe';



@NgModule({
  declarations: [
    poiSearchPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    poiSearchPipe
  ]
})
export class SharedModule { }
