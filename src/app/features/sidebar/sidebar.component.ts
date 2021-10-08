import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { User} from '@angular/fire/auth/'
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  public activatedSegment: string = "group"
  public rubriques = "rubriques"
  public all = "A - Z"
  
  constructor() { }

  ngOnInit(): void {
  }

  segmentChanged($event: any) {
    this.activatedSegment = $event.detail.value
  }

}
