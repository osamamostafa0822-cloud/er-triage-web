import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslationService } from './i18n/translation.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly i18n = inject(TranslationService);
}
