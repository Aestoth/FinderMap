import { Pipe, PipeTransform } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { iPois } from '@app/@interfaces/pois';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';

@Pipe({
  name: 'translate'
})
export class TranslatePipe implements PipeTransform {

  constructor(private readonly _wfService: WayfinderService) {}

  transform(data: iPois | iFloors , key: 'names'|'descriptions'): string {
    const lang: 'en' | 'fr' | 'es' = this._wfService.getLang();
    if(this.isFloor(data)) {
      return data.names.translations[lang]
    } else {
      return (data as iPois)?.[key]?.translations[lang] || ''
    }
  }

  isFloor(data: iPois | iFloors) {
    return (data as any).descriptions === undefined && 'active' in data
  }

}
