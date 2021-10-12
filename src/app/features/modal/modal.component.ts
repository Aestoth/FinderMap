import { Component, Input, OnInit } from '@angular/core';
import { iPois } from '@app/@interfaces/pois';
import { StorageService } from '@app/@services/storage/storage.service';
import { ModalController } from '@ionic/angular';



@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {

  public icons!: any
  
  @Input() modalPoi!: iPois

  constructor(private modal: ModalController, private readonly _storageService:StorageService ) { }

  ngOnInit(): void {
    this.icons = this._storageService.iconFile?.items.items
  }

  dismiss() {
    this.modal.dismiss()
  }
}
