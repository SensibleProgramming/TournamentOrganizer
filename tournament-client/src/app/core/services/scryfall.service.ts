import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ScryfallCard } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ScryfallService {
  private readonly BASE = 'https://api.scryfall.com';

  constructor(private http: HttpClient) {}

  getSuggestions(query: string): Observable<string[]> {
    if (!query || query.length < 2) return of([]);
    return this.http.get<{ data: string[] }>(`${this.BASE}/cards/autocomplete`, { params: { q: query } }).pipe(
      map(r => r.data),
      catchError(() => of([])),
    );
  }

  getCard(name: string): Observable<ScryfallCard | null> {
    return this.http.get<ScryfallCard>(`${this.BASE}/cards/named`, { params: { exact: name } }).pipe(
      catchError(() => of(null)),
    );
  }
}
