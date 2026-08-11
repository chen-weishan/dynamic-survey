// app.component.ts — 根元件
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { AuroraBackgroundComponent } from './shared/aurora-background/aurora-background.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, AuroraBackgroundComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'frontend';
}
