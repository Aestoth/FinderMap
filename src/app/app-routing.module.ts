import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: "full"
  },
  {
    path: 'welcome',
    loadChildren: () => import('./features/welcome/welcome.module').then( m => m.WelcomeModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./features/home/home.module').then( m => m.HomeModule)
  },
  {
    path: 'layout',
    loadChildren: () => import('./features/layout/layout.module').then( m => m.LayoutModule)
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
