import { Component, Input, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { ModalController } from '@ionic/angular';


@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {
  public poi: iPois[] = []

  @Input() modalPoi!: iPois

  constructor(private modal: ModalController) { }

  ngOnInit(): void {
    console.log("modal", this.modalPoi);
    console.log("image", this.modalPoi.icon.currentSrc)
       
  }

  dismiss() {
    this.modal.dismiss()
  }
}
