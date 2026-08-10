import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login',    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'home',     loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'fill/:id', loadComponent: () => import('./pages/survey-fill/survey-fill.component').then(m => m.SurveyFillComponent) },
  { path: 'history',  loadComponent: () => import('./pages/user-history/user-history.component').then(m => m.UserHistoryComponent) },
  { path: 'history/:responseId', loadComponent: () => import('./pages/response-detail/response-detail.component').then(m => m.ResponseDetailComponent) },
  { path: 'surveys',  loadComponent: () => import('./pages/survey-search/survey-search.component').then(m => m.SurveySearchComponent) },
  { path: 'admin', children: [
      { path: '',          loadComponent: () => import('./pages/admin/survey-list/survey-list.component').then(m => m.SurveyListComponent) },
      { path: 'create',    loadComponent: () => import('./pages/admin/survey-editor/survey-editor.component').then(m => m.SurveyEditorComponent) },
      { path: 'edit/:id',  loadComponent: () => import('./pages/admin/survey-editor/survey-editor.component').then(m => m.SurveyEditorComponent) },
      { path: 'stats/:id', loadComponent: () => import('./pages/admin/survey-stats/survey-stats.component').then(m => m.SurveyStatsComponent) },
      { path: 'responses/:id', loadComponent: () => import('./pages/admin/survey-responses/survey-responses.component').then(m => m.SurveyResponsesComponent) },
  ]},
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];
