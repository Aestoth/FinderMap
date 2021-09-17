import { Pipe, PipeTransform } from '@angular/core';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';

@Pipe({ name: 'translate' })
export class Translate implements PipeTransform {
  public wayfinder;

  constructor(private wfService: WayfinderService) {
    this.wayfinder = this.wfService;
  }
  transform(input: any): string {
    switch (true) {
      case input[this.wayfinder.getLanguage()]:
        return input[this.wayfinder.getLanguage()];
      case input['translations'] &&
        input['translations'][this.wayfinder.getLanguage()]:
        return input['translations'][this.wayfinder.getLanguage()];
      default:
        return '';
    }
  }
}
