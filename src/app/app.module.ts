import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IonicModule } from '@ionic/angular';
import { Provider } from './@provider/eventprovider';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { ToastInstallComponent } from './features/toast-install/toast-install.component';
import {  provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideStorage, getStorage} from '@angular/fire/storage';





@NgModule({
  declarations: [
    AppComponent,
    ToastInstallComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    IonicModule.forRoot(),
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    // import to configure firebase
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    // import to enable Firestore service
    provideFirestore(() => getFirestore()),
    // import to enable Auth service
    provideAuth(() => getAuth()),
    // import to configure firebase storage
    provideStorage(() => getStorage())
  ],
  providers: [Provider],
  bootstrap: [AppComponent]
})
export class AppModule { }
