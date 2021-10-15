import { Pipe, PipeTransform } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { getDownloadURL, StorageReference } from '@angular/fire/storage';

@Pipe({
  name: 'icon'
})
export class IconPipe implements PipeTransform {


  /**
   * Get the POI icon for modal info
   * 
   * @param poi target the POI
   * @param icons target the icons in firebase storage
   * @returns icons of POI or icons from firebase storage if POI icons doesn't exist
   */
  async transform(poi: iPois, icons: StorageReference[]): Promise<string | null>  {
    
    const iconName = icons.find(i => i.name.includes(poi.names.translations.en.toLowerCase()))
    const current = poi.icon?.currentSrc || ''
    console.log(icons);
    console.log(poi.names.translations.en);
    
    
    if(poi && current.length > 0) {
      return current
    } else if(current.length === 0 && iconName ) {
      const url = await getDownloadURL(iconName)
      return url
    }
    return null
  }

}
