import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {
  entityToString,
  EntityUtils, isNil,
  isNotNil,
  LocationLevelIds,
  ObservedLocation,
  Person,
  personToString,
  Referential,
  ReferentialRef,
  referentialToString
} from "../services/trip.model";
import {Moment} from 'moment/moment';
import {AcquisitionLevelCodes} from '../../core/core.module';
import {DateAdapter} from "@angular/material";
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {debounceTime, filter, map, mergeMap, startWith, switchMap, tap} from 'rxjs/operators';
import {ProgramService, ReferentialRefService} from '../../referential/referential.module';
import {ObservedLocationValidatorService} from "../services/observed-location.validator";
import {PersonService} from "../../admin/services/person.service";
import {MeasurementValuesForm} from "../measurement/measurement-values.form.class";
import {MeasurementsValidatorService} from "../services/measurement.validator";
import {FormArray, FormBuilder, FormControl} from "@angular/forms";

@Component({
  selector: 'form-observed-location',
  templateUrl: './observed-location.form.html',
  styleUrls: ['./observed-location.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObservedLocationForm extends MeasurementValuesForm<ObservedLocation> implements OnInit {

  observerFocusIndex: number;

  $programs: Observable<ReferentialRef[]>;
  $locations: Observable<ReferentialRef[]>;
  $observers: Observable<Person[]>;
  $observerFilterValue = new BehaviorSubject<any>(undefined);

  @Input() required = true;
  @Input() showError = true;
  @Input() showEndDateTime = true;
  @Input() showComment = true;
  @Input() showButtons = true;
  @Input() locationLevelIds: number[] = [LocationLevelIds.PORT];

  get empty(): any {
    const value = this.value;
    return (!value.location || !value.location.id)
      && (!value.startDateTime)
      && (!value.comments || !value.comments.length);
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty));
  }

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programService: ProgramService,
    protected cd: ChangeDetectorRef,
    protected validatorService: ObservedLocationValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected personService: PersonService
  ) {
    super(dateAdapter, measurementValidatorService, formBuilder, programService, cd, validatorService.getFormGroup());
    this._enable = false;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.OBSERVED_LOCATION;
  }

  ngOnInit() {
    super.ngOnInit();

    // Combo: programs
    this.$programs = this.form.controls['program']
      .valueChanges
      .pipe(
        startWith('*'),
        debounceTime(250),
        switchMap(value => this.referentialRefService.suggest(value, {
          entityName: 'Program'
        })),
        tap(res => this.updateImplicitValue('program', res))
      );

    // Propage program
    this.form.controls['program'].valueChanges
      .pipe(filter(EntityUtils.isNotEmpty))
      .subscribe(({label}) => this.program = label);

    // Combo: locations
    this.$locations = this.form.controls['location']
      .valueChanges
      .pipe(
        debounceTime(250),
        switchMap(value => this.referentialRefService.suggest(value, {
          entityName: 'Location',
          levelIds: this.locationLevelIds
        })),
        tap(res => this.updateImplicitValue('location', res))
      );

    // Combo: observers
    this.$observers = this.$observerFilterValue
      .pipe(
        debounceTime(250),
        switchMap(value => this.personService.suggest(value)),
        // Exclude existing observers
        map(values => {
          const existingIds = (this.form.get('observers').value || [])
            .map(o => o && o.id || -1);
          return values.filter(v => existingIds.indexOf(v.id) === -1);
        }),
        tap(res => this.updateImplicitValue('observer', res))
      );
  }

  public setValue(value: ObservedLocation) {
    if (!value) return;

    // Make sure to have (at least) one observer
    value.observers = value.observers && value.observers.length ? value.observers : [null];

    // Resize observers array
    this.resizeObserversArray(value.observers.length);

    // Send value for form
    super.setValue(value);

    // Propagate the program
    if (value.program && value.program.label) {
      this.program = value.program.label;
    }
  }

  public addObserver(value?: Person, options?: { emitEvent: boolean; }) {
    options = options || {emitEvent: true};
    console.debug("[observed-location-form] Adding observer");

    let arrayControl = this.form.get('observers') as FormArray;
    let hasChanged = false;
    let index = -1;

    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      this.form.addControl('observers', arrayControl);
    } else {

      // Search if value already exists
      if (EntityUtils.isNotEmpty(value)) {
        index = (arrayControl.value || []).findIndex(v => value.equals(v));
      }

      // If value not exists, but last value is empty: use it
      if (index === -1 && arrayControl.length && EntityUtils.isEmpty(arrayControl.at(arrayControl.length - 1).value)) {
        index = arrayControl.length - 1;
      }
    }

    // Replace the existing value
    if (index !== -1) {
      if (EntityUtils.isNotEmpty(value)) {
        arrayControl.at(index).patchValue(value, options);
        hasChanged = true;
      }
      this.markForCheck();
    } else {
      const control = this.validatorService.getObserverControl(value);
      arrayControl.push(control);
      index = arrayControl.length - 1;
      hasChanged = true;

      // Redirect control change into combo observers
      this.registerSubscription(
        control.valueChanges.subscribe(inputValue => this.$observerFilterValue.next(inputValue)));

    }

    if (hasChanged) {
      if (isNil(options.emitEvent) || options.emitEvent) {
        // Mark array control dirty
        if (EntityUtils.isNotEmpty(value)) {
          arrayControl.markAsDirty();
        }

        // Force focus on control
        this.observerFocusIndex = index;
        setTimeout(() => this.observerFocusIndex = undefined, 700);

      }

      this.markForCheck();
    }

    return hasChanged;
  }

  removeObserver($event: MouseEvent, index: number) {
    const arrayControl = this.form.get('observers') as FormArray;

    // Do not remove if last criterion
    if (arrayControl.length === 1) {
      this.clearObserver($event, index);
      return;
    }

    arrayControl.removeAt(index);

    this.markAsDirty();
  }

  public clearObserver($event: MouseEvent, index: number) {
    const arrayControl = this.form.get('observers') as FormArray;

    const control = arrayControl.at(index);
    if (EntityUtils.isEmpty(control.value)) return; // skip (not need to clear)

    control.setValue(null);

    this.markAsDirty();
  }

  public resizeObserversArray(length: number) {
    const arrayControl = this.form.get('observers') as FormArray;
    // Increase size
    while (arrayControl.length < length) {
      const control = this.validatorService.getObserverControl();
      arrayControl.push(control);
    }

    if (arrayControl.length === length) return;

    // Or reduce
    while (arrayControl.length > length) {
      arrayControl.at(arrayControl.length - 1);
    }
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }): void {
    super.enable(opts);

    // Leave program disable once data has been saved
    if (isNotNil(this.data.id) && !this.form.controls['program'].disabled) {
      this.form.controls['program'].disable({emitEvent: false});
      this.markForCheck();
    }
  }

  entityToString = entityToString;
  referentialToString = referentialToString;
  personToString = personToString;

  programToString(value: Referential): string {
    return value && value.label || undefined;
  }


  /* -- protected method -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
