import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScryfallService } from './scryfall.service';
import { ScryfallCard } from '../models/api.models';

describe('ScryfallService', () => {
  let service: ScryfallService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScryfallService],
    });
    service = TestBed.inject(ScryfallService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getSuggestions("") returns [] without making an HTTP request', done => {
    service.getSuggestions('').subscribe(result => {
      expect(result).toEqual([]);
      httpMock.expectNone('https://api.scryfall.com/cards/autocomplete');
      done();
    });
  });

  it('getSuggestions("l") — single char — returns [] without HTTP request', done => {
    service.getSuggestions('l').subscribe(result => {
      expect(result).toEqual([]);
      httpMock.expectNone('https://api.scryfall.com/cards/autocomplete');
      done();
    });
  });

  it('getSuggestions("li") calls GET /cards/autocomplete?q=li and maps .data', done => {
    service.getSuggestions('li').subscribe(result => {
      expect(result).toEqual(['Lightning Bolt', 'Lightning Helix']);
      done();
    });

    const req = httpMock.expectOne(r =>
      r.url === 'https://api.scryfall.com/cards/autocomplete' && r.params.get('q') === 'li',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ object: 'catalog', data: ['Lightning Bolt', 'Lightning Helix'] });
  });

  it('getSuggestions maps full card name list from .data array', done => {
    service.getSuggestions('sol').subscribe(result => {
      expect(result).toEqual(['Sol Ring', 'Sol Talisman']);
      done();
    });

    const req = httpMock.expectOne(r => r.params.get('q') === 'sol');
    req.flush({ object: 'catalog', data: ['Sol Ring', 'Sol Talisman'] });
  });

  it('HTTP error returns [] without throwing', done => {
    service.getSuggestions('crash').subscribe(result => {
      expect(result).toEqual([]);
      done();
    });

    const req = httpMock.expectOne(r => r.params.get('q') === 'crash');
    req.error(new ProgressEvent('error'));
  });
});

describe('ScryfallService — getCard', () => {
  let service: ScryfallService;
  let httpMock: HttpTestingController;

  const mockCard: ScryfallCard = {
    name: 'Lightning Bolt',
    image_uris: { normal: 'https://cards.scryfall.io/normal/bolt.jpg', large: 'https://cards.scryfall.io/large/bolt.jpg' },
    prices: { usd: '0.50', usd_foil: '3.00' },
    purchase_uris: { tcgplayer: 'https://tcgplayer.com/bolt', cardkingdom: 'https://cardkingdom.com/bolt' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScryfallService],
    });
    service = TestBed.inject(ScryfallService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCard calls GET /cards/named?exact=<name>', done => {
    service.getCard('Lightning Bolt').subscribe(card => {
      expect(card).toEqual(mockCard);
      done();
    });
    const req = httpMock.expectOne(r =>
      r.url === 'https://api.scryfall.com/cards/named' && r.params.get('exact') === 'Lightning Bolt'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockCard);
  });

  it('getCard returns null on HTTP error (card not found)', done => {
    service.getCard('Nonexistent Card').subscribe(card => {
      expect(card).toBeNull();
      done();
    });
    const req = httpMock.expectOne(r => r.params.get('exact') === 'Nonexistent Card');
    req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });
  });

  it('getCard returns null on server error without throwing', done => {
    service.getCard('crash').subscribe(card => {
      expect(card).toBeNull();
      done();
    });
    const req = httpMock.expectOne(r => r.params.get('exact') === 'crash');
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
  });

  it('getCard handles double-faced card (card_faces present, no image_uris at root)', done => {
    const dfcCard: ScryfallCard = {
      name: 'Delver of Secrets',
      card_faces: [
        { image_uris: { normal: 'https://cards.scryfall.io/normal/delver-front.jpg', large: 'https://cards.scryfall.io/large/delver-front.jpg' } },
        { image_uris: { normal: 'https://cards.scryfall.io/normal/delver-back.jpg', large: 'https://cards.scryfall.io/large/delver-back.jpg' } },
      ],
      prices: { usd: '2.00', usd_foil: '10.00' },
      purchase_uris: { tcgplayer: 'https://tcgplayer.com/delver' },
    };
    service.getCard('Delver of Secrets').subscribe(card => {
      expect(card).toEqual(dfcCard);
      done();
    });
    const req = httpMock.expectOne(r => r.params.get('exact') === 'Delver of Secrets');
    req.flush(dfcCard);
  });
});
