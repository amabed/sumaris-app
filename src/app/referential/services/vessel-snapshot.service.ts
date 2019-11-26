import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Observable} from "rxjs";
import {Department, EntityUtils, isNotNil, Person, VesselSnapshot} from "./model";
import {DataService, EditorDataService, isNilOrBlank, LoadResult, TableDataService} from "../../shared/shared.module";
import {BaseDataService} from "../../core/core.module";
import {map} from "rxjs/operators";
import {Moment} from "moment";

import {ErrorCodes} from "./errors";
import {AccountService} from "../../core/services/account.service";
import {SuggestionDataService} from "../../shared/services/data-service.class";
import {GraphqlService} from "../../core/services/graphql.service";
import {ReferentialFragments} from "./referential.queries";
import {FetchPolicy} from "apollo-client";
import {isEmptyArray} from "../../shared/functions";
import {VesselFeaturesService} from "./vessel-features.service";
import {EntityAsObjectOptions, MINIFY_OPTIONS} from "../../core/services/model";
import {VesselFilter} from "./vessel-service";

export const VesselSnapshotFragments = {
  lightVesselSnapshot: gql`fragment LightVesselSnapshotFragment on VesselSnapshotVO {
    id
    startDate
    endDate
    name
    exteriorMarking
    registrationCode
    administrativePower
    lengthOverAll
    grossTonnageGt
    grossTonnageGrt
    creationDate
    updateDate
    comments
    vesselType {
      ...ReferentialFragment
    }
    vesselStatusId
    basePortLocation {
      ...LocationFragment
    }
    registrationLocation {
      ...LocationFragment
    }
    recorderDepartment {
     ...LightDepartmentFragment
    }
  }`,
  vesselSnapshot: gql`fragment VesselSnapshotFragment on VesselSnapshotVO {
    id
    startDate
    endDate
    name
    exteriorMarking
    registrationCode
    administrativePower
    lengthOverAll
    grossTonnageGt
    grossTonnageGrt
    creationDate
    updateDate
    comments
    vesselType {
        ...ReferentialFragment
    }
    vesselStatusId
    basePortLocation {
      ...LocationFragment
    }
    registrationLocation {
      ...LocationFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
    recorderPerson {
      ...LightPersonFragment
    }
  }`,
};

const LoadAllQuery: any = gql`
  query Vessels($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput){
    vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightVesselSnapshotFragment
    }
  }
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${ReferentialFragments.location}
  ${ReferentialFragments.lightDepartment}
  ${ReferentialFragments.referential}
`;
const LoadQuery: any = gql`
  query Vessel($vesselId: Int, $vesselFeaturesId: Int) {
    vesselSnapshots(filter: {vesselId: $vesselId, vesselFeaturesId: $vesselFeaturesId}) {
      ...VesselSnapshotFragment
    }
  }
  ${VesselSnapshotFragments.vesselSnapshot}
  ${ReferentialFragments.location}
  ${ReferentialFragments.lightDepartment}
  ${ReferentialFragments.lightPerson}
  ${ReferentialFragments.referential}
`;

@Injectable({providedIn: 'root'})
export class VesselSnapshotService
  extends BaseDataService
  implements SuggestionDataService<VesselSnapshot>, DataService<VesselSnapshot, VesselFilter> {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  /**
   * Load many vessels
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   */
  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: string,
                filter?: VesselFilter): Promise<LoadResult<VesselSnapshot>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'exteriorMarking',
      sortDirection: sortDirection || 'asc',
      filter: {
        date: filter.date,
        vesselId: filter.vesselId,
        searchText: filter.searchText,
        statusIds: isNotNil(filter.statusId) ?  [filter.statusId] : filter.statusIds
      }
    };
    console.debug("[vessel-snapshot-service] Getting vessel snapshots using options:", variables);
    const res = await this.graphql.query<{ vesselSnapshots: any[] }>({
      query: LoadAllQuery,
      variables: variables,
      error: {code: ErrorCodes.LOAD_VESSELS_ERROR, message: "VESSEL.ERROR.LOAD_VESSELS_ERROR"}
    });

    const data = (res && res.vesselSnapshots || []).map(VesselSnapshot.fromObject);
    return {
      data: data
    };
  }

  async suggest(value: any, options?: {
    date: Date | Moment;
    statusIds?: number[];
  }): Promise<VesselSnapshot[]> {
    if (EntityUtils.isNotEmpty(value)) return [value];
    value = (typeof value === "string" && value !== '*') && value || undefined;
    const res = await this.loadAll(0, !value ? 30 : 10, undefined, undefined,
      {
        statusIds: options && options.statusIds || undefined,
        date: options && options.date || undefined,
        searchText: value as string
      }
    );
    return res.data;
  }

  async load(id: number, opts?: {
    fetchPolicy?: FetchPolicy
  }): Promise<VesselSnapshot | null> {
    console.debug("[vessel-snapshot-service] Loading vessel snapshot " + id);

    const data = await this.graphql.query<{ vesselSnapshots: any }>({
      query: LoadQuery,
      variables: {
        vesselId: id,
        vesselFeaturesId: null
      },
      fetchPolicy: opts && opts.fetchPolicy || undefined
    });

    if (data && data.vesselSnapshots && data.vesselSnapshots.length) {
      const res = new VesselSnapshot();
      res.fromObject(data.vesselSnapshots[0]);
      return res;
    }
    return null;
  }

  async saveAll(vessels: VesselSnapshot[]): Promise<VesselSnapshot[]> {
    throw new Error("Not implemented.");
  }

  deleteAll(vessels: VesselSnapshot[]): Promise<any> {
    throw new Error("Not implemented.");
  }

  /* -- protected methods -- */

}