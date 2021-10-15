import { Pipe, PipeTransform } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';

@Pipe({
  name: 'poiSearch',
})
export class poiSearchPipe implements PipeTransform {

  /**
   * Search for a poi based on the user's input
   * 
   * @param pois target the POIs
   * @param term target the search word
   * @param uid target user uid if exist
   * @returns returns the result of the search sorted by alphabetical order or sorted by number of views if a user is logged in
   */
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
