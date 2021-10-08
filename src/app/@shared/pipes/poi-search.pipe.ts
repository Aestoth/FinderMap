import { Pipe, PipeTransform } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';

@Pipe({
  name: 'poiSearch',
})
export class poiSearchPipe implements PipeTransform {
  transform(
    pois: iPois[] | null,
    term: string = '',
    uid?: string | null | undefined
  ): iPois[] | null {
    if (pois != null) {
      const filtered = pois.filter((poi) => {
        const name = poi.names.translations.en.toLowerCase();
        return name.startsWith(term.toLowerCase());
      });
      if (uid && term.length > 0) {
        return filtered.sort((a, b) => {
          return (b.views||0) - (a.views||0) ;
        });
      }
      return filtered.sort((a,b) => a.names.translations.en.localeCompare(b.names.translations.en))
    }
    return null;
  }
}
