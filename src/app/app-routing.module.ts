import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [
  {
    path: 'tabs', loadChildren: () => import('./features/tabs/tabs.module').then(m => m.TabsModule)
  },
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: "full"
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
