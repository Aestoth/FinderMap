import { Pipe, PipeTransform } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';

@Pipe({
  name: 'poiSearch',
})
export class poiSearchPipe implements PipeTransform {
  transform(pois: iPois[] | null, term: string = ''): iPois[] | null {
    if (pois != null) {
      return pois.filter(poi => {
        const name = poi.names.translations.en.toLowerCase();
        return name.indexOf(term.toLowerCase()) > -1;
      });
    }
    return null;
  }
}
