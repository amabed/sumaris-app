import {Observable} from "rxjs";
import {Apollo} from "apollo-angular";
import {ApolloQueryResult, FetchPolicy} from "apollo-client";
import {R} from "apollo-angular/types";
import {ErrorCodes, ServerErrorCodes, ServiceError} from "./errors";
import {map} from "rxjs/operators";

import {environment} from '../../../environments/environment';
import {delay} from "q";
import {GraphqlService} from "./graphql.service";

export abstract class BaseDataService {

  protected _debug = false;
  protected _lastVariables: any = {
    loadAll: undefined,
    load: undefined
  };

  protected constructor(
    protected graphql: GraphqlService
  ) {

  }

  /**
   * @deprecated
   */
  protected mutate<T, V = R>(opts: {
    mutation: any,
    variables: V,
    error?: ServiceError
  }): Promise<T> {

    return this.graphql.mutate(opts);
  }

  protected subscribe<T, V = R>(opts: {
    query: any,
    variables: V,
    error?: ServiceError
  }): Observable<T> {
    return this.graphql.subscribe(opts);
  }

  protected addToQueryCache<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, newValue: any) {
    return this.graphql.addToQueryCache(opts, propertyName, newValue);
  }

  protected addManyToQueryCache<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, newValues: any[]) {
    return this.graphql.addManyToQueryCache(opts, propertyName, newValues);
  }

  protected removeToQueryCacheById<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, idToRemove: number) {
    return this.graphql.removeToQueryCacheById(opts, propertyName, idToRemove);
  }

  protected removeToQueryCacheByIds<V = R>(opts: {
    query: any,
    variables: V
  }, propertyName: string, idsToRemove: number[]) {
    return this.graphql.removeToQueryCacheByIds(opts, propertyName, idsToRemove);
  }
}
