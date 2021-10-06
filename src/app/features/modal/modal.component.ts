import { Component, Input, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { StorageService } from '@app/@services/storage/storage.service';
import { IonItemSliding, ModalController } from '@ionic/angular';


@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {

  public icons!: any


  @Input() modalPoi!: iPois

  constructor(private modal: ModalController, private iconStorage:StorageService ) { }

  ngOnInit(): void {
    this.icons = this.iconStorage.iconFile
  }

  dismiss() {
    this.modal.dismiss()
  }
}
