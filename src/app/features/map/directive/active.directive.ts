import { Directive, ElementRef, Input, Renderer2, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { iFloors } from '@app/@interfaces/floors';

@Directive({
  selector: '[appActive]'
})
export class ActiveDirective implements OnInit, OnChanges {

  @Input() appActive!: boolean
  

  constructor(private element: ElementRef, private renderer: Renderer2) {
 }

 ngOnInit(): void {
  
 }

 ngOnChanges(changes: SimpleChanges) {
  this.toggleColor()
 }

 toggleColor() {
  let el = this.element.nativeElement;
  if(!el) return
  if(this.appActive){
     this.renderer.setStyle(el, 'background', '#ff7051');
   } else {
     this.renderer.setStyle(el, 'background', '#ffffff');
   }
 }

}
