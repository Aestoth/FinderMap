import { Component, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  public activatedSegment: string = "group"
  public rubriques = "rubriques"
  public all = "A - Z"
  public currentList: iPois[] = []

  constructor() { }

  ngOnInit(): void {
  }

  segmentChanged($event: any) {
    this.activatedSegment = $event.detail.value
  }


}