import { Directive, ElementRef, Input, Renderer2, OnInit } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';

@Directive({
  selector: '[appActive]'
})
export class ActiveDirective implements OnInit {

  @Input() appActive!: iFloors

  constructor(private element: ElementRef, private renderer: Renderer2) {
 }

 ngOnInit(): void {
  let el = this.element.nativeElement;
   if(this.appActive.active){
      this.renderer.setStyle(el, 'background', 'blue');
    } else {
      this.renderer.setStyle(el, 'background', 'gray');
    }
 }

}
