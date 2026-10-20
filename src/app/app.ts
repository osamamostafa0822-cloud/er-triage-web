import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslationService } from './i18n/translation.service';
import { AppShell } from './shared/ui/app-shell';

@Component({
  imports: [RouterOutlet, AppShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  protected readonly boardHref = this.router.config.some((route) => route.path === '') ? '/' : null;
  protected readonly registerHref = this.router.config.some((route) => route.path === 'register')
    ? '/register'
    : null;
}
