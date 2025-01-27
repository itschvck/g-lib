import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GLibComponent } from './g-lib.component';

describe('GLibComponent', () => {
  let component: GLibComponent;
  let fixture: ComponentFixture<GLibComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GLibComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
