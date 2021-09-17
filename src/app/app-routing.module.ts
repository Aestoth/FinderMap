import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {path: '', component: LayoutComponent,
  children: [
    {
      path: '', loadChildren: () => import ("./layout/layout.module").then(m => m.LayoutModule)
    }]
  },
  {
    path: "",
    redirectTo: "/",
    pathMatch: "full"
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
