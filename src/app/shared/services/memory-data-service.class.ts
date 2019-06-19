import {Observable, Subject} from "rxjs-compat";
import {LoadResult, TableDataService} from "../../core/core.module";
import {IEntityWithMeasurement} from "../../trip/services/model/measurement.model";
import {EntityUtils} from "../../core/services/model";
import {map, mergeMap} from "rxjs/operators";

export interface InMemoryTableDataServiceOptions<T> {
  onSort?: (data: T[], sortBy?: string, sortDirection?: string) => T[];
  onLoad?: (data: T[]) => T[] | Promise<T[]>;
  onSave?: (data: T[]) => T[] | Promise<T[]>;
}

export class InMemoryTableDataService<T extends IEntityWithMeasurement<T>, F> implements TableDataService<T, F> {

  private _dataSubject = new Subject<LoadResult<T>>();

  private readonly _sortFn: (data: T[], sortBy?: string, sortDirection?: string) => T[];
  private readonly _onLoad: (data: T[]) => T[] | Promise<T[]>;
  private readonly _onSaveFn: (data: T[]) => T[] | Promise<T[]>;

  hasRankOrder = false;
  debug = false;
  data: T[];

  set value(data: T[]) {
    if (this.data !== data) {
      this.data = data;
      this._dataSubject.next({data: data || [], total: data && data.length || 0});
    }
  }

  get value(): T[] {
    return this.data;
  }

  constructor(
    protected dataType: new() => T,
    protected options?: InMemoryTableDataServiceOptions<T>
  ) {

    this._sortFn = options && options.onSort || this.sort;
    this._onLoad = options && options.onLoad || null;
    this._onSaveFn = options && options.onSave || null;

    // Detect rankOrder on the entity class
    this.hasRankOrder = Object.getOwnPropertyNames(new dataType()).findIndex(key => key === 'rankOrder') !== -1;
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: string,
    filter?: F,
    options?: any
  ): Observable<LoadResult<T>> {

    if (!this.data) {
      console.warn("[memory-data-service] Waiting value to be set...");
    } else {
      // /!\ Always create a copy of the original array
      // Because datasource will only update if the array changed
      this.data = this.data.splice(0);

      setTimeout(() => {
        this._dataSubject.next({
          data: this.data,
          total: this.data.length
        });
      });
    }

    return this._dataSubject
      .pipe(
        mergeMap(async ({data, total}) => {
          // Apply sort
          data = this._sortFn(data, sortBy, sortDirection);

          if (this._onLoad) {
            const res = this._onLoad(data);
            data = ((res instanceof Promise)) ? await res : res;
          }

          return {
            data,
            total
          };
        })
      );
  }

  async saveAll(data: T[], options?: any): Promise<T[]> {
    if (!this.data) throw new Error("[memory-service] Could not save, because value not set");

    if (this._onSaveFn) {
      const res = this._onSaveFn(data);
      data = ((res instanceof Promise)) ? await res : res;
    }

    this.data = data;
    return this.data;
  }

  async deleteAll(data: T[], options?: any): Promise<any> {
    if (!this.data) throw new Error("[memory-service] Could not delete, because value not set");

    // Remove deleted item, from data
    this.data = this.data.reduce((res, item) => {
      const keep = data.findIndex(i => item.equals(i)) === -1;
      return keep ? res.concat(item) : res;
    }, []);
  }

  sort(data: T[], sortBy?: string, sortDirection?: string): T[] {
    // Replace id with rankOrder
    sortBy = this.hasRankOrder && (!sortBy || sortBy === 'id') ? 'rankOrder' : sortBy || 'id';

    // Execute the sort
    return EntityUtils.sort(data, sortBy, sortDirection);
  }
}
