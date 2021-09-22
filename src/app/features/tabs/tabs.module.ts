import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TabsComponent } from './tabs.component';


@NgModule({
  declarations: [
    TabsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{
      path: '', component: TabsComponent, 
      children: [
        {
          path: 'layout', 
          children: [
            {
              path: '', loadChildren: () => import('../../layout/layout.module').then(m => m.LayoutModule)
            }
          ]   
        },
        {
          path: '', redirectTo: 'layout', pathMatch: 'full'
        }
      ]
  }])
  ],
  exports: [TabsComponent]
})
export class TabsModule { }
