import {Directive, Injector, Input} from "@angular/core";
import {ValidatorService} from "angular4-material-table";
import {AppTable, EntitiesTableDataSource, Entity} from "../../core/core.module";
import {InMemoryEntitiesService} from "../../shared/services/memory-entity-service.class";
import {ActivatedRoute, Router} from "@angular/router";
import {ModalController, Platform} from "@ionic/angular";
import {Location} from "@angular/common";
import {isEmptyArray} from "../../shared/functions";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {AppTableDataSourceOptions} from "./entities-table-datasource.class";

@Directive()
export abstract class AppInMemoryTable<T extends Entity<T>, F = any> extends AppTable<T, F> {

  @Input() canEdit = false;
  @Input() canDelete = false;

  set value(data: T[]) {
    this.setValue(data);
  }

  get value(): T[] {
    return this.memoryDataService.value;
  }

 /* get dirty(): boolean {
    return this._dirty || this.memoryDataService.dirty;
  }*/

  constructor(
    protected injector: Injector,
    protected columns: string[],
    protected dataType: new () => T,
    protected memoryDataService: InMemoryEntitiesService<T, F>,
    protected validatorService: ValidatorService,
    options?: AppTableDataSourceOptions<T>,
    filter?: F
  ) {
    super(injector.get(ActivatedRoute),
      injector.get(Router),
      injector.get(Platform),
      injector.get(Location),
      injector.get(ModalController),
      injector.get(LocalSettingsService),
      columns,
      new EntitiesTableDataSource<T, F>(dataType, memoryDataService, validatorService, {
        suppressErrors: true,
        prependNewElements: false,
        ...options
      }),
      filter,
      injector);

    this.autoLoad = false; // waiting value to be set
  }

  ngOnInit() {
    super.ngOnInit();
  }

  setValue(value: T[]) {
    // Reset previous error
    if (this.error) {
      this.error = null;
      this.markForCheck();
    }
    const firstCall = isEmptyArray(this.memoryDataService.value);
    this.memoryDataService.value = value;
    if (firstCall) {
      this.onRefresh.emit();
    }
  }

  async deleteSelection(confirm?: boolean): Promise<void> {

    await super.deleteSelection(confirm);

    if (confirm) {
      this._dirty = true;
    }
  }
}

