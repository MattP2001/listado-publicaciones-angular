import { Component } from '@angular/core';
import { PantallaTransaccionesComponent } from './transacciones/pantalla-transacciones.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PantallaTransaccionesComponent],
  template: `<main><app-pantalla-transacciones /></main>`,
})
export class AppComponent {}
