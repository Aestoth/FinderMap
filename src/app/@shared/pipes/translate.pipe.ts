import { Pipe, PipeTransform } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';
import { iPois } from '@app/@interfaces/pois';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';

@Pipe({
  name: 'translate'
})
export class TranslatePipe implements PipeTransform {

  constructor(private readonly _wfService: WayfinderService) {}


  /**
   * Get language from the type of data
   * 
   * @param data target data by type
   * @param key target key of data
   * @returns data according to the key
   */
  transform(data: iPois | iFloors , key: 'names'|'descriptions'): string {
    const lang: 'en' | 'fr' | 'es' = this._wfService.getLang();
    if(this.isFloor(data)) {
      return data.names.translations[lang]
    } else {
      return (data as iPois)?.[key]?.translations[lang] || ''
    }
  }

  /**
   * Get iFloors data even if description is undefined
   * 
   * @param data target data by type
   * @returns data based on iFloors description status
   */
  isFloor(data: iPois | iFloors) {
    return (data as any).descriptions === undefined && 'active' in data
  }

}
