import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Observable} from "rxjs";
import {VesselRegistration} from "./model/vessel.model";
import {LoadResult, EntitiesService} from "../../shared/shared.module";
import {BaseEntityService} from "../../core/core.module";
import {map} from "rxjs/operators";
import {ErrorCodes} from "./errors";
import {GraphqlService} from "../../core/services/graphql.service";
import {ReferentialFragments} from "./referential.fragments";
import {VesselFilter} from "./vessel-service";
import {SortDirection} from "@angular/material/sort";

export const RegistrationFragments = {
  registration: gql`fragment RegistrationFragment on VesselRegistrationVO {
    id
    startDate
    endDate
    registrationCode
    intRegistrationCode
    registrationLocation {
      ...LocationFragment
    }
  }`,
};

export const LoadRegistrationsQuery: any = gql`
    query VesselRegistrationHistory($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $vesselId: Int){
        vesselRegistrationHistory(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, vesselId: $vesselId){
            ...RegistrationFragment
        }
    }
    ${RegistrationFragments.registration}
    ${ReferentialFragments.location}
`;

@Injectable({providedIn: 'root'})
export class VesselRegistrationService
  extends BaseEntityService
  implements EntitiesService<VesselRegistration, VesselFilter> {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  /**
   * Load vessel registrations histroy
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           filter?: VesselFilter): Observable<LoadResult<VesselRegistration>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'startDate',
      sortDirection: sortDirection || 'asc',
      vesselId: filter.vesselId
    };

    const now = Date.now();
    if (this._debug) console.debug("[vessel-registration-history-service] Getting vessel registration history using options:", variables);

    return this.mutableWatchQuery<{ vesselRegistrationHistory: any[] }>({
      queryName: 'LoadRegistrations',
      query: LoadRegistrationsQuery,
      arrayFieldName: 'vesselRegistrationHistory',
      insertFilterFn: (vr: VesselRegistration) => vr.vesselId === filter.vesselId,
      variables: variables,
      error: {code: ErrorCodes.LOAD_VESSELS_ERROR, message: "VESSEL.ERROR.LOAD_VESSELS_ERROR"}
    })
      .pipe(
        map(({vesselRegistrationHistory}) => {
            const data = (vesselRegistrationHistory || []).map(VesselRegistration.fromObject);
            if (this._debug) console.debug(`[vessel-registration-history-service] Vessel registration history loaded in ${Date.now() - now}ms`, data);
            return {
              data: data
            };
          }
        )
      );
  }

  deleteAll(data: VesselRegistration[], options?: any): Promise<any> {
    throw new Error("Method not implemented.");
  }

  saveAll(data: VesselRegistration[], options?: any): Promise<VesselRegistration[]> {
    throw new Error("Method not implemented.");
  }

  /* -- protected methods -- */

}
