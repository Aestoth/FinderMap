import { Component, Input, OnInit } from '@angular/core';
import { WayfinderService } from '@app/@services/wayfinder/wayfinder.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  
  constructor() {}

  ngOnInit(): void {
  }

}
