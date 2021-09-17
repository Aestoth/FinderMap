import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeysPipe } from './pipes/keys.pipe';
import { Translate } from './pipes/translate';


@NgModule({
  declarations: [
    KeysPipe,
    Translate
  ],
  imports: [
    CommonModule
  ],
  exports: [
    KeysPipe,
    Translate
  ]
})
export class SharedModule { }
